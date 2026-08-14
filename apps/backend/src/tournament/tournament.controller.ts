import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import {
  CreateTournamentInput,
  TournamentParticipantSnapshot,
  RecordBracketResultInput,
  TournamentDTO,
  TournamentFacade,
  TournamentParticipant,
} from '@tournament/adapters'
import { MatchFacade, MatchDTO, MatchParticipantSnapshot } from '@match/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor, Id, NotFoundError, Errors } from 'shared'
import { PrismaTournamentRepository } from './prisma-tournament-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { BullMqMatchLockQueue } from '../match/bullmq-match-lock-queue'
import { BullMqSettlementQueue } from '../betting/bullmq-settlement-queue'
import { PrismaCategoryRepository } from '../category/prisma-category-repository'
import { PrismaParticipantRepository } from '../participant/prisma-participant-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'
import { requireFields } from '../shared/require-fields'

// Betting window for a match created for a non-first bracket round: the previous
// round has just settled, so the match opens now and auto-locks after this delay.
const NEXT_ROUND_BETTING_WINDOW_MS = 60 * 60 * 1000

/**
 * Protected by the AuthMiddleware (see tournament.module). Reading (list/detail)
 * is open to any authenticated user; creating, cancelling and declaring a
 * confrontation result are admin-only.
 *
 * This controller is the CROSS-CONTEXT orchestrator: a tournament ORCHESTRATES
 * matches. Each bracket confrontation is a plain Match (with the tournament's
 * bestOf) created here via the MatchFacade; recording its units' results settles
 * the Match once the series is decided, enqueues its bet payout and advances the
 * bracket — creating the next matches. The dependency is one-way (tournament →
 * match), so there is no Nest module cycle.
 */
@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly tournamentRepository: PrismaTournamentRepository,
    private readonly matchRepository: PrismaMatchRepository,
    private readonly lockQueue: BullMqMatchLockQueue,
    private readonly settlementQueue: BullMqSettlementQueue,
    private readonly categoryRepository: PrismaCategoryRepository,
    private readonly participantRepository: PrismaParticipantRepository,
  ) {}

  private tournamentFacade(): TournamentFacade {
    return new TournamentFacade(this.tournamentRepository, this.tournamentRepository)
  }

  private matchFacade(): MatchFacade {
    return new MatchFacade(this.matchRepository, this.matchRepository, this.lockQueue)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  // The tournament's own participants already carry the catalog snapshot (taken
  // when the tournament was created) — reused as-is for the Match this
  // confrontation creates, no extra catalog lookup needed.
  private snapshotOf(participant: TournamentParticipant): MatchParticipantSnapshot {
    return {
      participantId: participant.participantId,
      displayName: participant.displayName,
      nickname: participant.nickname,
      imageUrl: participant.imageUrl,
    }
  }

  private async resolveCategoryIsLeaf(categoryId: string): Promise<boolean> {
    const category = await this.categoryRepository.findByIdQuery(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)
    return category.isLeaf
  }

  // Cross-context: resolve each participantId against the catalog (must exist)
  // into the snapshot the tournament use case needs — tournament never imports
  // @participant/core. Preserves the order the admin picked.
  private async resolveParticipants(
    participantIds: string[],
  ): Promise<TournamentParticipantSnapshot[]> {
    const catalog = await this.participantRepository.findByIdsQuery(participantIds)
    return participantIds.map((participantId) => {
      const participant = catalog.find((entry) => entry.id === participantId)
      if (!participant) NotFoundError.throwError(Errors.PARTICIPANT_NOT_FOUND, participantId)
      return {
        participantId: participant.id,
        displayName: participant.name,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      }
    })
  }

  /**
   * Creates a real Match for every bracket slot that is ready (both players known)
   * but has no match yet, and links it back to the slot. Round-0 matches lock when
   * the tournament starts; later-round matches open now and lock after the standard
   * betting window. Cross-context glue — kept in the app layer.
   */
  private async createPendingMatches(tournamentId: string, actor: AuthenticatedActor): Promise<void> {
    const tournament = await this.tournamentRepository.findAggregate(tournamentId)
    if (!tournament) return

    const pending = tournament.pendingMatchSlots()
    if (pending.length === 0) return

    for (const slot of pending) {
      const matchId = Id.create()
      const playerA = tournament.participants.find((participant) => participant.id.value === slot.playerAId)!
      const playerB = tournament.participants.find((participant) => participant.id.value === slot.playerBId)!
      const scheduledAt =
        slot.round === 0
          ? tournament.scheduledAt
          : new Date(Date.now() + NEXT_ROUND_BETTING_WINDOW_MS)

      await this.matchFacade().createMatch(
        {
          title: `${playerA.displayName} vs ${playerB.displayName}`,
          categoryId: tournament.categoryId,
          // No banner of its own — inherit the tournament's, so the confrontation
          // never shows up bare in the lobby/match page.
          imageUrl: tournament.imageUrl,
          scheduledAt: scheduledAt.toISOString(),
          rakeBasisPoints: tournament.rakeBasisPoints,
          bestOf: tournament.bestOfFor(slot.round),
          // A bracket confrontation must always produce a real winner to
          // advance the tournament — it never offers the draw selection.
          allowsDraw: false,
          participantIds: [playerA.participantId, playerB.participantId],
        },
        actor,
        // The tournament's category was validated as a leaf at creation.
        true,
        // Already resolved on the tournament's own participants (snapshotted
        // when the tournament was created) — no extra catalog lookup needed.
        [this.snapshotOf(playerA), this.snapshotOf(playerB)],
        matchId,
      )
      tournament.attachMatch(slot.round, slot.position, matchId)
    }

    await this.tournamentRepository.update(tournament)
  }

  /**
   * Creates a real Match for every group-stage matchup that has none yet.
   * Unlike bracket rounds, the WHOLE group stage is known upfront (round-
   * robin), so this only ever needs to run once, right after creation — never
   * from the result route. No-ops for a tournament with no group stage.
   */
  private async createPendingGroupMatches(tournamentId: string, actor: AuthenticatedActor): Promise<void> {
    const tournament = await this.tournamentRepository.findAggregate(tournamentId)
    if (!tournament) return

    const pending = tournament.pendingGroupMatchSlots()
    if (pending.length === 0) return

    for (const slot of pending) {
      const matchId = Id.create()
      const playerA = tournament.participants.find((participant) => participant.id.value === slot.playerAId)!
      const playerB = tournament.participants.find((participant) => participant.id.value === slot.playerBId)!

      await this.matchFacade().createMatch(
        {
          title: `${playerA.displayName} vs ${playerB.displayName} (Grupo ${slot.groupIndex + 1})`,
          categoryId: tournament.categoryId,
          // No banner of its own — inherit the tournament's, same as a bracket
          // confrontation.
          imageUrl: tournament.imageUrl,
          // Group matches all open together and lock at the tournament's start,
          // same as a round-0 knockout confrontation.
          scheduledAt: tournament.scheduledAt.toISOString(),
          rakeBasisPoints: tournament.rakeBasisPoints,
          bestOf: tournament.groupStageBestOf,
          // A group matchup must always produce a real winner (feeds the
          // standings) — it never offers the draw selection.
          allowsDraw: false,
          participantIds: [playerA.participantId, playerB.participantId],
        },
        actor,
        true,
        [this.snapshotOf(playerA), this.snapshotOf(playerB)],
        matchId,
      )
      tournament.attachGroupMatch(slot.groupIndex, slot.matchupIndex, matchId)
    }

    await this.tournamentRepository.update(tournament)
  }

  @Get()
  list(): Promise<TournamentDTO[]> {
    return this.tournamentFacade().listTournaments()
  }

  // Reverse lookup so the match page knows whether to declare a result through
  // this controller's route (which advances the bracket/group) or the plain
  // match one — see the comment on RecordMatchUnitResult in the match page.
  // MUST be declared before the ':id' route below, or Nest would match
  // "by-match" itself as an :id.
  @Get('by-match/:matchId')
  async byMatch(@Param('matchId') matchId: string): Promise<{ tournamentId: string | null }> {
    const tournamentId = await this.tournamentRepository.findTournamentIdByMatchId(matchId)
    return { tournamentId }
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<TournamentDTO> {
    return this.tournamentFacade().getTournament(id)
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AdminGuard)
  async create(@Body() input: CreateTournamentInput, @authenticatedUser() user: UserDTO) {
    requireFields(input, ['title', 'categoryId', 'scheduledAt', 'size', 'participantIds'])
    const actor = this.actor(user)
    const categoryIsLeaf = await this.resolveCategoryIsLeaf(input.categoryId)
    const participants = await this.resolveParticipants(input.participantIds)
    // Pre-generate the id so we can create the round-0 matches right after.
    const tournamentId = Id.create()
    await this.tournamentFacade().createTournament(
      input,
      actor,
      categoryIsLeaf,
      participants,
      tournamentId,
    )
    // Only one of these ever does anything for a given tournament: the group
    // stage (if any) is scheduled all at once here; without one, round 0 of
    // the knockout bracket is.
    await this.createPendingGroupMatches(tournamentId, actor)
    await this.createPendingMatches(tournamentId, actor)
    return { id: tournamentId }
  }

  @Post(':id/cancel')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async cancel(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.tournamentFacade().cancelTournament(id, this.actor(user))
    // Refund the outright (champion) bets of the tournament (worker refunds). The
    // per-confrontation bets live on their own matches and are unaffected here.
    await this.settlementQueue.enqueue({
      marketId: id,
      winningSelectionId: null,
      rakeBasisPoints: 0,
      cancelled: true,
    })
  }

  // Records the winner of the confrontation's next unit. A bestOf-1 confrontation
  // decides (and advances the bracket) right away; a bestOf-3/5 one may need this
  // called again for the following units before the bracket actually advances.
  @Post(':id/matches/:matchId/result')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async recordUnitResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() input: RecordBracketResultInput,
    @authenticatedUser() user: UserDTO,
  ): Promise<MatchDTO> {
    const actor = this.actor(user)

    // Settling requires the match to be locked; lock it first if betting is open,
    // so the admin can declare the result in a single action from the bracket.
    const current = await this.matchFacade().getMatch(matchId)
    if (current.status === 'open') await this.matchFacade().lockMatch(matchId, actor)

    // 1. Record this unit's winner on the Match (admin).
    await this.matchFacade().recordUnitResult(matchId, input, actor)
    const match = await this.matchFacade().getMatch(matchId)
    // The bestOf series isn't decided yet — wait for the next unit's result.
    if (match.status !== 'settled') return match

    // 2. Enqueue the parimutuel payout of this confrontation's bets (worker).
    await this.settlementQueue.enqueue({
      marketId: matchId,
      winningSelectionId: match.winnerParticipantId,
      rakeBasisPoints: match.rakeBasisPoints,
    })
    // 3. Advance the tournament by the winner's name (the tournament's natural
    // key) — a group matchup (feeds its group's standings) or a knockout
    // confrontation (feeds the bracket), whichever this matchId is. Units won
    // by each side only matter for a group matchup, but are cheap to resolve
    // from the settled Match either way (never allows a draw, so every unit
    // has a winner).
    const winnerName = match.participants.find(
      (participant) => participant.id === match.winnerParticipantId,
    )?.displayName
    if (!winnerName) return match
    const unitsWonByWinner = match.units.filter(
      (unit) => unit.winnerParticipantId === match.winnerParticipantId,
    ).length
    const unitsWonByLoser = match.units.length - unitsWonByWinner
    await this.tournamentFacade().recordResult(id, matchId, winnerName, unitsWonByWinner, unitsWonByLoser)
    // 4. Create the matches for whatever slots just became ready (next round,
    // or — the first time — the knockout bracket's round 0, once the group
    // stage above just completed).
    await this.createPendingMatches(id, actor)
    // 5. If that was the final, settle the outright (champion) market too.
    const tournament = await this.tournamentFacade().getTournament(id)
    if (tournament.status === 'finished' && tournament.championParticipantId) {
      await this.settlementQueue.enqueue({
        marketId: id,
        winningSelectionId: tournament.championParticipantId,
        rakeBasisPoints: tournament.rakeBasisPoints,
      })
    }
    return match
  }
}
