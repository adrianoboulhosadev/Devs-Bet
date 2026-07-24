import {
  Entity,
  EntityProps,
  ValidationError,
  ConflictError,
  Errors,
} from 'shared'
import { TournamentParticipant, TournamentParticipantProps } from './tournament-participant'
import { BracketSlot, BracketSlotProps } from './bracket-slot'
import { BracketBuilder, VALID_TOURNAMENT_SIZES } from '../domain-services/bracket-builder'
import { BracketAdvancer } from '../domain-services/bracket-advancer'

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
  championParticipantId?: string | null
  participants?: TournamentParticipantProps[]
  // Present on reconstitution (from the DB); absent for a brand-new tournament,
  // where the constructor lays out the bracket from the participants.
  slots?: BracketSlotProps[]
}

const MAX_BASIS_POINTS = 10_000

/**
 * Rich tournament aggregate: a single-elimination bracket over 2..32 competitors
 * (powers of 2). It ORCHESTRATES matches without knowing the match context — each
 * confrontation is a plain Match created by the app layer; here we only hold the
 * bracket structure and advance winners. Invariants (valid size, exact number of
 * participants, unique names) live in the constructor; the bracket transitions
 * (attach a match, record a result, crown the champion) live in the methods.
 */
export class Tournament extends Entity<Tournament, TournamentProps> {
  readonly creatorId: string
  readonly title: string
  readonly categoryId: string
  readonly imageUrl: string | null
  readonly scheduledAt: Date
  readonly rakeBasisPoints: number
  readonly size: number
  readonly participants: TournamentParticipant[]
  readonly slots: BracketSlot[]
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

    // Reconstitute the bracket from the DB, or lay it out fresh from the players.
    const slots = props.slots
      ? props.slots.map((slot) => new BracketSlot(slot))
      : BracketBuilder.build(
          size,
          participants.map((participant) => participant.id.value),
        ).map((seed) => new BracketSlot(seed))

    this.creatorId = props.creatorId
    this.title = title
    this.categoryId = categoryId
    this.imageUrl = props.imageUrl ?? null
    this.scheduledAt = scheduledAt
    this.rakeBasisPoints = rakeBasisPoints
    this.size = size
    this.status = props.status ?? 'in_progress'
    this.championParticipantId = props.championParticipantId ?? null
    this.participants = participants
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

  /** Number of rounds in the bracket (log2 of the size). */
  get roundCount(): number {
    return BracketBuilder.roundCount(this.size)
  }

  get isFinished(): boolean {
    return this.status === 'finished'
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

  /** Links the Match the backend created to its slot. */
  attachMatch(round: number, position: number, matchId: string): void {
    this.findSlot(round, position).matchId = matchId
  }

  /**
   * Records the winner of a confrontation and advances the bracket. The winner
   * arrives as a displayName (resolved from the settled Match) and must be one of
   * the slot's two players; the winner moves to the parent slot, or is crowned
   * champion (and the tournament finishes) when the final is decided.
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

    const parent = BracketAdvancer.parentOf(slot.round, slot.position, this.size)
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
