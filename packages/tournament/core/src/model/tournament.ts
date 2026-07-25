import {
  Entity,
  EntityProps,
  ValidationError,
  ConflictError,
  Errors,
} from 'shared'
import { TournamentParticipant, TournamentParticipantProps } from './tournament-participant'
import { BracketSlot, BracketSlotProps } from './bracket-slot'
import { GroupMatchSlot, GroupMatchSlotProps } from './group-match-slot'
import { BracketBuilder, VALID_TOURNAMENT_SIZES } from '../domain-services/bracket-builder'
import { BracketAdvancer } from '../domain-services/bracket-advancer'
import { GroupBuilder, GROUP_STAGE_THRESHOLD } from '../domain-services/group-builder'
import { GroupStandingsCalculator } from '../domain-services/group-standings-calculator'

export type TournamentStatus = 'in_progress' | 'finished' | 'cancelled'

export interface TournamentProps extends EntityProps {
  creatorId: string
  title?: string
  // Leaf of the category tree (logical FK). Leaf-ness is checked in the use case
  // with data the backend resolves — here we only require the id.
  categoryId?: string
  imageUrl?: string | null
  scheduledAt?: Date
  status?: TournamentStatus
  size?: number
  rakeBasisPoints?: number
  // How many units decide each round's confrontations, ONE ENTRY PER KNOCKOUT
  // ROUND (index 0 = fullest round, last = the final — see `qualifierCount`,
  // NOT the raw `size`, when there's a group stage) — so e.g. every round can be
  // MD3 except an MD5 final. Applied to the Match the backend creates for that
  // round (see Match.bestOf); a confrontation never allows a draw regardless.
  // The group stage itself reuses bestOfByRound[0] (see `groupStageBestOf`).
  bestOfByRound?: number[]
  championParticipantId?: string | null
  participants?: TournamentParticipantProps[]
  // Present on reconstitution (from the DB); absent for a brand-new tournament,
  // where the constructor lays out the group stage from the participants.
  groupMatches?: GroupMatchSlotProps[]
  // Present on reconstitution; absent for a brand-new tournament, where the
  // constructor lays out the bracket immediately UNLESS there's a group stage
  // (hasGroupStage) — then it starts empty until the group stage completes.
  slots?: BracketSlotProps[]
}

const MAX_BASIS_POINTS = 10_000
// Duplicated on purpose, like the rake bounds — Tournament doesn't import
// @match/core (contexts touch only via ports); see Match.VALID_BEST_OF.
const VALID_BEST_OF = [1, 3, 5]

/**
 * Rich tournament aggregate: a single-elimination bracket over 2..128
 * competitors (powers of 2). It ORCHESTRATES matches without knowing the match
 * context — each confrontation is a plain Match created by the app layer; here
 * we only hold the bracket (and, above GROUP_STAGE_THRESHOLD, group) structure
 * and advance winners. Invariants (valid size, exact number of participants,
 * unique names) live in the constructor; the transitions (attach a match,
 * record a result, crown the champion) live in the methods.
 *
 * Above GROUP_STAGE_THRESHOLD (32) the tournament ADDS a round-robin group
 * stage in front of the knockout bracket: participants split into groups of 4,
 * every group plays all 6 pairwise matchups, and each group's top two (by
 * GroupStandingsCalculator) seed the knockout bracket once every group matchup
 * is settled (`startKnockoutFromGroups`, called automatically from
 * `recordConfrontationResult`) — e.g. 64 participants → 16 groups → 32
 * qualifiers → the SAME round-of-32 knockout an ordinary 32-size tournament
 * plays. At or below 32, behavior is exactly the pre-existing pure knockout
 * (`hasGroupStage` is false, `groupMatches` is empty, `slots` built immediately).
 */
export class Tournament extends Entity<Tournament, TournamentProps> {
  readonly creatorId: string
  readonly title: string
  readonly categoryId: string
  readonly imageUrl: string | null
  readonly scheduledAt: Date
  readonly rakeBasisPoints: number
  readonly bestOfByRound: number[]
  readonly size: number
  readonly participants: TournamentParticipant[]
  readonly groupMatches: GroupMatchSlot[]
  // Not readonly: starts empty for a group-stage tournament until
  // `startKnockoutFromGroups` builds it from the group qualifiers.
  slots: BracketSlot[]
  status: TournamentStatus
  championParticipantId: string | null

  constructor(props: TournamentProps) {
    super(props)

    const title = props.title?.trim() ?? ''
    if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    const categoryId = props.categoryId?.trim() ?? ''
    if (!categoryId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'categoryId')

    // Required start time; reject a past date only for a brand-new tournament.
    // Reconstitution always carries the persisted `slots`, so their absence marks
    // a new tournament — this lets the backend pre-generate the id (to create the
    // round-0 matches) without disabling the not-in-the-past rule.
    const scheduledAt = Tournament.requireScheduledAt(props.scheduledAt, !props.slots)

    const size = props.size ?? 0
    if (!VALID_TOURNAMENT_SIZES.includes(size as (typeof VALID_TOURNAMENT_SIZES)[number])) {
      ValidationError.throwError(Errors.INVALID_TOURNAMENT_SIZE, size)
    }

    const participants = (props.participants ?? []).map(
      (participant) => new TournamentParticipant(participant),
    )
    if (participants.length !== size) {
      ValidationError.throwError(Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS, participants.length)
    }
    const uniqueNames = new Set(participants.map((participant) => participant.displayName))
    if (uniqueNames.size !== participants.length) {
      ValidationError.throwError(Errors.DUPLICATE_PARTICIPANT_NAME, participants.length)
    }

    const rakeBasisPoints = props.rakeBasisPoints ?? 0
    if (rakeBasisPoints < 0 || rakeBasisPoints > MAX_BASIS_POINTS) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, rakeBasisPoints)
    }

    const hasGroupStage = size > GROUP_STAGE_THRESHOLD
    // The knockout bracket is sized to its actual entrants: everyone when there
    // is no group stage, or each group's top two once it does (size / 2).
    const qualifierCount = hasGroupStage ? size / 2 : size

    const roundCount = BracketBuilder.roundCount(qualifierCount)
    const bestOfByRound = props.bestOfByRound ?? Array(roundCount).fill(1)
    if (bestOfByRound.length !== roundCount) {
      ValidationError.throwError(Errors.INVALID_BEST_OF, bestOfByRound.length)
    }
    for (const bestOf of bestOfByRound) {
      if (!VALID_BEST_OF.includes(bestOf)) ValidationError.throwError(Errors.INVALID_BEST_OF, bestOf)
    }

    const participantIds = participants.map((participant) => participant.id.value)

    // Reconstitute the group stage from the DB, or lay it out fresh from the
    // players (only when this tournament actually has one).
    const groupMatches = props.groupMatches
      ? props.groupMatches.map((slot) => new GroupMatchSlot(slot))
      : hasGroupStage
        ? GroupBuilder.build(size, participantIds).map((seed) => new GroupMatchSlot(seed))
        : []

    // Reconstitute the bracket from the DB, or lay it out fresh from the
    // players — UNLESS there's a group stage, in which case the knockout
    // entrants aren't known yet; it starts empty and `startKnockoutFromGroups`
    // builds it once every group matchup is settled.
    const slots = props.slots
      ? props.slots.map((slot) => new BracketSlot(slot))
      : hasGroupStage
        ? []
        : BracketBuilder.build(size, participantIds).map((seed) => new BracketSlot(seed))

    this.creatorId = props.creatorId
    this.title = title
    this.categoryId = categoryId
    this.imageUrl = props.imageUrl ?? null
    this.scheduledAt = scheduledAt
    this.rakeBasisPoints = rakeBasisPoints
    this.bestOfByRound = bestOfByRound
    this.size = size
    this.status = props.status ?? 'in_progress'
    this.championParticipantId = props.championParticipantId ?? null
    this.participants = participants
    this.groupMatches = groupMatches
    this.slots = slots
  }

  private static requireScheduledAt(scheduledAt: Date | undefined, enforceFuture: boolean): Date {
    if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'scheduledAt')
    }
    if (enforceFuture && scheduledAt.getTime() <= Date.now()) {
      ValidationError.throwError(Errors.SCHEDULED_IN_PAST, scheduledAt.toISOString())
    }
    return scheduledAt
  }

  /** Whether this tournament runs a round-robin group stage before the
   * knockout bracket (only above GROUP_STAGE_THRESHOLD participants). */
  get hasGroupStage(): boolean {
    return this.size > GROUP_STAGE_THRESHOLD
  }

  /** How many entrants actually reach the knockout bracket: everyone without a
   * group stage, or each group's top two with one. */
  get qualifierCount(): number {
    return this.hasGroupStage ? this.size / 2 : this.size
  }

  /** 'group' until every group matchup is settled and the bracket is built from
   * the qualifiers; 'knockout' from the start when there's no group stage. */
  get phase(): 'group' | 'knockout' {
    return this.hasGroupStage && this.slots.length === 0 ? 'group' : 'knockout'
  }

  /** bestOf applied to every group-stage matchup — reuses the knockout's
   * fullest-round value (bestOfByRound[0]); the group stage has no rounds of
   * its own to assign a value per round. */
  get groupStageBestOf(): number {
    return this.bestOfByRound[0]
  }

  /** Number of rounds in the knockout bracket (log2 of its entrant count). */
  get roundCount(): number {
    return BracketBuilder.roundCount(this.qualifierCount)
  }

  get isFinished(): boolean {
    return this.status === 'finished'
  }

  /** bestOf for a given KNOCKOUT round (0 = fullest round; the last is the final). */
  bestOfFor(round: number): number {
    return this.bestOfByRound[round]
  }

  participantName(participantId: string | null): string | null {
    if (!participantId) return null
    return (
      this.participants.find((participant) => participant.id.value === participantId)?.displayName ??
      null
    )
  }

  private findSlot(round: number, position: number): BracketSlot {
    const slot = this.slots.find((current) => current.round === round && current.position === position)
    if (!slot) ValidationError.throwError(Errors.BRACKET_SLOT_NOT_FOUND, `${round}:${position}`)
    return slot
  }

  /** Slots whose two players are known but that still lack a Match — the backend
   * creates a Match for each and calls `attachMatch`. */
  pendingMatchSlots(): BracketSlot[] {
    return this.slots.filter((slot) => slot.needsMatch)
  }

  /** Group matchups without a Match yet — every one is ready immediately (the
   * whole group stage is scheduled at once, unlike the bracket's later rounds).
   * The backend creates a Match for each and calls `attachGroupMatch`. */
  pendingGroupMatchSlots(): GroupMatchSlot[] {
    return this.groupMatches.filter((slot) => slot.needsMatch)
  }

  /** Links the Match the backend created to its slot. */
  attachMatch(round: number, position: number, matchId: string): void {
    this.findSlot(round, position).matchId = matchId
  }

  /** Links the Match the backend created to its group matchup. */
  attachGroupMatch(groupIndex: number, matchupIndex: number, matchId: string): void {
    const slot = this.groupMatches.find(
      (current) => current.groupIndex === groupIndex && current.matchupIndex === matchupIndex,
    )
    if (!slot) ValidationError.throwError(Errors.BRACKET_SLOT_NOT_FOUND, `${groupIndex}:${matchupIndex}`)
    slot.matchId = matchId
  }

  /**
   * Records the result of ANY tournament confrontation — a group-stage matchup
   * or a knockout confrontation, whichever `matchId` belongs to — and advances
   * the tournament accordingly. This is the single entry point the backend
   * calls; `unitsWonByWinner`/`unitsWonByLoser` (resolved from the settled
   * Match) only matter for a group matchup (the knockout's standings-free
   * bracket doesn't need them) but are always accepted for one uniform call.
   */
  recordConfrontationResult(
    matchId: string,
    winnerDisplayName: string,
    unitsWonByWinner: number,
    unitsWonByLoser: number,
  ): void {
    if (this.status === 'cancelled') ConflictError.throwError(Errors.TOURNAMENT_NOT_OPEN, this.status)
    if (this.status === 'finished') {
      ConflictError.throwError(Errors.TOURNAMENT_ALREADY_FINISHED, this.status)
    }

    const groupSlot = this.groupMatches.find((slot) => slot.matchId === matchId)
    if (groupSlot) {
      this.recordGroupMatchResult(groupSlot, winnerDisplayName, unitsWonByWinner, unitsWonByLoser)
      return
    }

    this.recordResult(matchId, winnerDisplayName)
  }

  private recordGroupMatchResult(
    slot: GroupMatchSlot,
    winnerDisplayName: string,
    unitsWonByWinner: number,
    unitsWonByLoser: number,
  ): void {
    const nameA = this.participantName(slot.playerAId)
    const nameB = this.participantName(slot.playerBId)
    const winnerId =
      winnerDisplayName === nameA
        ? slot.playerAId
        : winnerDisplayName === nameB
          ? slot.playerBId
          : null
    if (!winnerId) ValidationError.throwError(Errors.NOT_A_PARTICIPANT, winnerDisplayName)

    slot.winnerParticipantId = winnerId
    if (winnerId === slot.playerAId) {
      slot.unitsWonByA = unitsWonByWinner
      slot.unitsWonByB = unitsWonByLoser
    } else {
      slot.unitsWonByA = unitsWonByLoser
      slot.unitsWonByB = unitsWonByWinner
    }

    const groupStageOngoing = this.groupMatches.some((match) => !match.isSettled)
    if (groupStageOngoing) return

    this.startKnockoutFromGroups()
  }

  /** Every group matchup is settled — rank each group, take its top two, and
   * lay out the knockout bracket over the qualifiers (cross-seeded so a
   * group's own pair cannot meet in the bracket's first round). Moves the
   * tournament into its knockout phase. */
  private startKnockoutFromGroups(): void {
    const groupCount = GroupBuilder.groupCount(this.size)
    const topTwoPerGroup: [string, string][] = []

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
      const matches = this.groupMatches.filter((match) => match.groupIndex === groupIndex)
      const memberIds = [...new Set(matches.flatMap((match) => [match.playerAId, match.playerBId]))]
      const standings = GroupStandingsCalculator.calculate(memberIds, matches)
      topTwoPerGroup.push([standings[0].participantId, standings[1].participantId])
    }

    const entrants = GroupBuilder.seedKnockoutEntrants(topTwoPerGroup)
    this.slots = BracketBuilder.build(this.qualifierCount, entrants).map((seed) => new BracketSlot(seed))
  }

  /**
   * Records the winner of a KNOCKOUT confrontation and advances the bracket.
   * The winner arrives as a displayName (resolved from the settled Match) and
   * must be one of the slot's two players; the winner moves to the parent
   * slot, or is crowned champion (and the tournament finishes) when the final
   * is decided. Called directly for a tournament with no group stage, or via
   * `recordConfrontationResult` once the group stage has fed the bracket.
   */
  recordResult(matchId: string, winnerDisplayName: string): void {
    if (this.status === 'cancelled') ConflictError.throwError(Errors.TOURNAMENT_NOT_OPEN, this.status)
    if (this.status === 'finished') {
      ConflictError.throwError(Errors.TOURNAMENT_ALREADY_FINISHED, this.status)
    }

    const slot = this.slots.find((current) => current.matchId === matchId)
    if (!slot) ValidationError.throwError(Errors.BRACKET_SLOT_NOT_FOUND, matchId)

    const nameA = this.participantName(slot.playerAId)
    const nameB = this.participantName(slot.playerBId)
    const winnerId =
      winnerDisplayName === nameA
        ? slot.playerAId
        : winnerDisplayName === nameB
          ? slot.playerBId
          : null
    if (!winnerId) ValidationError.throwError(Errors.NOT_A_PARTICIPANT, winnerDisplayName)

    const parent = BracketAdvancer.parentOf(slot.round, slot.position, this.qualifierCount)
    if (!parent) {
      // The final is decided — crown the champion.
      this.championParticipantId = winnerId
      this.status = 'finished'
      return
    }

    const parentSlot = this.findSlot(parent.round, parent.position)
    if (parent.side === 'A') parentSlot.playerAId = winnerId
    else parentSlot.playerBId = winnerId
  }

  /** Aborts the tournament. Not allowed once finished. */
  cancel(): void {
    if (this.status === 'finished') {
      ConflictError.throwError(Errors.TOURNAMENT_ALREADY_FINISHED, this.status)
    }
    this.status = 'cancelled'
  }
}
