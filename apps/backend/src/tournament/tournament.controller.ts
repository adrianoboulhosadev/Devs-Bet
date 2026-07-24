import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import {
  CreateTournamentInput,
  RecordBracketResultInput,
  TournamentDTO,
  TournamentFacade,
} from '@tournament/adapters'
import { MatchFacade } from '@match/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor, Id, NotFoundError, Errors } from 'shared'
import { PrismaTournamentRepository } from './prisma-tournament-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { BullMqMatchLockQueue } from '../match/bullmq-match-lock-queue'
import { BullMqSettlementQueue } from '../betting/bullmq-settlement-queue'
import { PrismaCategoryRepository } from '../category/prisma-category-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

// Betting window for a match created for a non-first bracket round: the previous
// round has just settled, so the match opens now and auto-locks after this delay.
const NEXT_ROUND_BETTING_WINDOW_MS = 60 * 60 * 1000

/**
 * Protected by the AuthMiddleware (see tournament.module). Reading (list/detail)
 * is open to any authenticated user; creating, cancelling and declaring a
 * confrontation result are admin-only.
 *
 * This controller is the CROSS-CONTEXT orchestrator: a tournament ORCHESTRATES
 * matches. Each bracket confrontation is a plain Match created here via the
 * MatchFacade; declaring its winner settles the Match, enqueues its bet payout and
 * advances the bracket — creating the next matches. The dependency is one-way
 * (tournament → match), so there is no Nest module cycle.
 */
@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly tournamentRepository: PrismaTournamentRepository,
    private readonly matchRepository: PrismaMatchRepository,
    private readonly lockQueue: BullMqMatchLockQueue,
    private readonly settlementQueue: BullMqSettlementQueue,
    private readonly categoryRepository: PrismaCategoryRepository,
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

  private async resolveCategoryIsLeaf(categoryId: string): Promise<boolean> {
    const category = await this.categoryRepository.findByIdQuery(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)
    return category.isLeaf
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
      const nameA = tournament.participantName(slot.playerAId)!
      const nameB = tournament.participantName(slot.playerBId)!
      const scheduledAt =
        slot.round === 0
          ? tournament.scheduledAt
          : new Date(Date.now() + NEXT_ROUND_BETTING_WINDOW_MS)

      await this.matchFacade().createMatch(
        {
          title: `${nameA} vs ${nameB}`,
          categoryId: tournament.categoryId,
          imageUrl: null,
          scheduledAt: scheduledAt.toISOString(),
          rakeBasisPoints: tournament.rakeBasisPoints,
          // A bracket confrontation must always produce a real winner to
          // advance the tournament — it never offers the draw selection.
          allowsDraw: false,
          participants: [{ displayName: nameA }, { displayName: nameB }],
        },
        actor,
        // The tournament's category was validated as a leaf at creation.
        true,
        matchId,
      )
      tournament.attachMatch(slot.round, slot.position, matchId)
    }

    await this.tournamentRepository.update(tournament)
  }

  @Get()
  list(): Promise<TournamentDTO[]> {
    return this.tournamentFacade().listTournaments()
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<TournamentDTO> {
    return this.tournamentFacade().getTournament(id)
  }

  @Post()
  @HttpCode(201)
  @UseGuards(AdminGuard)
  async create(@Body() input: CreateTournamentInput, @authenticatedUser() user: UserDTO) {
    const actor = this.actor(user)
    const categoryIsLeaf = await this.resolveCategoryIsLeaf(input.categoryId)
    // Pre-generate the id so we can create the round-0 matches right after.
    const tournamentId = Id.create()
    await this.tournamentFacade().createTournament(input, actor, categoryIsLeaf, tournamentId)
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

  @Post(':id/matches/:matchId/result')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async declareResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() input: RecordBracketResultInput,
    @authenticatedUser() user: UserDTO,
  ) {
    const actor = this.actor(user)

    // Settling requires the match to be locked; lock it first if betting is open,
    // so the admin can declare the result in a single action from the bracket.
    const current = await this.matchFacade().getMatch(matchId)
    if (current.status === 'open') await this.matchFacade().lockMatch(matchId, actor)

    // 1. Record the winner on the Match (admin).
    await this.matchFacade().declareResult(matchId, input, actor)
    // 2. Enqueue the parimutuel payout of this confrontation's bets (worker).
    const match = await this.matchFacade().getMatch(matchId)
    await this.settlementQueue.enqueue({
      marketId: matchId,
      winningSelectionId: match.winnerParticipantId,
      rakeBasisPoints: match.rakeBasisPoints,
    })
    // 3. Advance the bracket by the winner's name (the tournament's natural key).
    const winnerName = match.participants.find(
      (participant) => participant.id === match.winnerParticipantId,
    )?.displayName
    if (!winnerName) return
    await this.tournamentFacade().recordResult(id, matchId, winnerName)
    // 4. Create the matches for whatever slots just became ready (next round).
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
  }
}
