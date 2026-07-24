import { Entity, EntityProps, ValidationError, ConflictError, Errors } from 'shared'
import { MatchParticipant, MatchParticipantProps } from './match-participant'

export type MatchStatus = 'open' | 'locked' | 'settled' | 'cancelled'

export interface MatchProps extends EntityProps {
  creatorId: string
  title?: string
  gameType?: string | null
  imageUrl?: string | null
  scheduledAt?: Date
  status?: MatchStatus
  rakeBasisPoints?: number
  winnerParticipantId?: string | null
  participants?: MatchParticipantProps[]
  lockedAt?: Date | null
  settledAt?: Date | null
}

const MIN_PARTICIPANTS = 2
const MAX_BASIS_POINTS = 10_000

/**
 * Rich match aggregate: a contest between 2+ participants with a guarded
 * lifecycle. The state machine lives in the model — `open → locked → settled`
 * (or `→ cancelled`) — and every transition rejects illegal moves. Betting is
 * only allowed while `open`; the result can only be declared once `locked`.
 */
export class Match extends Entity<Match, MatchProps> {
  readonly creatorId: string
  readonly imageUrl: string | null
  readonly rakeBasisPoints: number
  readonly participants: MatchParticipant[]
  title: string
  gameType: string | null
  scheduledAt: Date
  status: MatchStatus
  winnerParticipantId: string | null
  lockedAt: Date | null
  settledAt: Date | null

  constructor(props: MatchProps) {
    super(props)
    const title = props.title?.trim() ?? ''
    if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    // Required: when the match will happen. `!props.id` means a brand-new match
    // (reconstitution from the DB always carries an id) — only then do we reject
    // a past date; a match that already started must still reconstitute.
    const scheduledAt = Match.requireScheduledAt(props.scheduledAt, !props.id)

    const participants = (props.participants ?? []).map(
      (participant) => new MatchParticipant(participant),
    )
    if (participants.length < MIN_PARTICIPANTS) {
      ValidationError.throwError(Errors.NOT_ENOUGH_PARTICIPANTS, participants.length)
    }

    const rakeBasisPoints = props.rakeBasisPoints ?? 0
    if (rakeBasisPoints < 0 || rakeBasisPoints > MAX_BASIS_POINTS) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, rakeBasisPoints)
    }

    this.creatorId = props.creatorId
    this.title = title
    this.gameType = props.gameType ?? null
    this.imageUrl = props.imageUrl ?? null
    this.scheduledAt = scheduledAt
    this.rakeBasisPoints = rakeBasisPoints
    this.participants = participants
    this.status = props.status ?? 'open'
    this.winnerParticipantId = props.winnerParticipantId ?? null
    this.lockedAt = props.lockedAt ?? null
    this.settledAt = props.settledAt ?? null
  }

  // Required scheduledAt; `enforceFuture` rejects a past date (creation/edit) but
  // not reconstitution of a match that already happened.
  private static requireScheduledAt(scheduledAt: Date | undefined, enforceFuture: boolean): Date {
    if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'scheduledAt')
    }
    if (enforceFuture && scheduledAt.getTime() <= Date.now()) {
      ValidationError.throwError(Errors.SCHEDULED_IN_PAST, scheduledAt.toISOString())
    }
    return scheduledAt
  }

  /**
   * Admin edits the mutable details. Only while `open` — once betting is locked
   * (or the match settled/cancelled) the details are frozen. Participants are
   * NOT editable (kept fixed after creation, so placed bets stay valid); the
   * image is set only at creation. Each provided field is validated like on
   * creation (title non-empty, scheduledAt required and not in the past).
   */
  edit(fields: { title?: string; gameType?: string | null; scheduledAt?: Date }): void {
    if (this.status !== 'open') ConflictError.throwError(Errors.MATCH_NOT_OPEN, this.status)

    if (fields.title !== undefined) {
      const title = fields.title.trim()
      if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')
      this.title = title
    }
    if (fields.gameType !== undefined) this.gameType = fields.gameType ?? null
    if (fields.scheduledAt !== undefined) {
      this.scheduledAt = Match.requireScheduledAt(fields.scheduledAt, true)
    }
  }

  get isOpen(): boolean {
    return this.status === 'open'
  }

  hasParticipant(participantId: string): boolean {
    return this.participants.some((participant) => participant.id.value === participantId)
  }

  /** Closes betting before the match happens. */
  lockBetting(): void {
    if (this.status !== 'open') ConflictError.throwError(Errors.MATCH_NOT_OPEN, this.status)
    this.status = 'locked'
    this.lockedAt = new Date()
  }

  /** Declares the winner. Only from `locked`; the winner must be a participant. */
  settle(winnerParticipantId: string): void {
    if (this.status === 'settled' || this.status === 'cancelled') {
      ConflictError.throwError(Errors.MATCH_ALREADY_SETTLED, this.status)
    }
    if (this.status !== 'locked') {
      ConflictError.throwError(Errors.INVALID_MATCH_STATUS, this.status)
    }
    if (!this.hasParticipant(winnerParticipantId)) {
      ValidationError.throwError(Errors.NOT_A_PARTICIPANT, winnerParticipantId)
    }
    this.status = 'settled'
    this.winnerParticipantId = winnerParticipantId
    this.settledAt = new Date()
  }

  /** Aborts the match (refund-all downstream). Not allowed once settled. */
  cancel(): void {
    if (this.status === 'settled') ConflictError.throwError(Errors.MATCH_ALREADY_SETTLED, this.status)
    this.status = 'cancelled'
  }
}
