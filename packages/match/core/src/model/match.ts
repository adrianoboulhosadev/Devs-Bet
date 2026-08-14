import { Entity, EntityProps, ValidationError, ConflictError, Errors } from 'shared'
import { MatchParticipant, MatchParticipantProps } from './match-participant'
import { MatchUnit, MatchUnitProps } from './match-unit'

export type MatchStatus = 'open' | 'locked' | 'settled' | 'cancelled'

// Betting selection id for "the match ends in a draw" — a match-only pseudo
// selection alongside the participants (a tournament confrontation can never
// draw, so it never offers this selection). Bettors can back a draw just like
// any participant; if the match actually draws, this is the winning selection
// of the parimutuel payout (nobody backing it means everyone else loses).
export const MATCH_DRAW_SELECTION_ID = 'draw'

// A match is decided over an odd number of units (map/leg/round/fight — a
// sport-agnostic "bestOf"): first to the majority wins. Even bestOf is
// rejected — it could tie without a decisive unit left.
export const VALID_BEST_OF = [1, 3, 5] as const
export type BestOf = (typeof VALID_BEST_OF)[number]

export interface MatchProps extends EntityProps {
  creatorId: string
  title?: string
  // Leaf of the category tree this match belongs to (logical FK). Required.
  categoryId?: string
  imageUrl?: string | null
  scheduledAt?: Date
  status?: MatchStatus
  rakeBasisPoints?: number
  // How many units decide the match (1, 3 or 5 — first to the majority wins).
  // Defaults to 1 (a single unit, decided outright).
  bestOf?: number
  // Whether this match can end in a draw (and therefore offers the draw
  // betting selection). Decided at creation, immutable — e.g. a tournament
  // confrontation is created with this false, since it must always advance
  // the bracket with a real winner. Only legal when bestOf is 1 (a multi-unit
  // series always has a majority winner, so it can never draw). Defaults to
  // true for a standalone bestOf-1 match.
  allowsDraw?: boolean
  winnerParticipantId?: string | null
  participants?: MatchParticipantProps[]
  units?: MatchUnitProps[]
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
  readonly bestOf: number
  readonly allowsDraw: boolean
  readonly participants: MatchParticipant[]
  units: MatchUnit[]
  title: string
  categoryId: string
  scheduledAt: Date
  status: MatchStatus
  winnerParticipantId: string | null
  lockedAt: Date | null
  settledAt: Date | null

  constructor(props: MatchProps) {
    super(props)
    const title = props.title?.trim() ?? ''
    if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')

    // Required: the category leaf. Leaf-ness (a cross-context rule) is checked in
    // the use case with data resolved by the app; here we only require the id.
    const categoryId = props.categoryId?.trim() ?? ''
    if (!categoryId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'categoryId')

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
    const uniqueParticipantIds = new Set(participants.map((participant) => participant.participantId))
    if (uniqueParticipantIds.size !== participants.length) {
      ValidationError.throwError(Errors.DUPLICATE_PARTICIPANT_NAME, participants.length)
    }

    const rakeBasisPoints = props.rakeBasisPoints ?? 0
    if (rakeBasisPoints < 0 || rakeBasisPoints > MAX_BASIS_POINTS) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, rakeBasisPoints)
    }

    const bestOf = props.bestOf ?? 1
    if (!VALID_BEST_OF.includes(bestOf as BestOf)) {
      ValidationError.throwError(Errors.INVALID_BEST_OF, bestOf)
    }

    // A multi-unit series always has a majority winner, so it can never draw.
    const allowsDraw = props.allowsDraw ?? true
    if (allowsDraw && bestOf !== 1) {
      ValidationError.throwError(Errors.DRAW_NOT_ALLOWED, bestOf)
    }

    this.creatorId = props.creatorId
    this.title = title
    this.categoryId = categoryId
    this.imageUrl = props.imageUrl ?? null
    this.scheduledAt = scheduledAt
    this.rakeBasisPoints = rakeBasisPoints
    this.bestOf = bestOf
    this.allowsDraw = allowsDraw
    this.participants = participants
    this.units = (props.units ?? []).map((unit) => new MatchUnit(unit))
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
  edit(fields: { title?: string; categoryId?: string; scheduledAt?: Date }): void {
    if (this.status !== 'open') ConflictError.throwError(Errors.MATCH_NOT_OPEN, this.status)

    if (fields.title !== undefined) {
      const title = fields.title.trim()
      if (!title) ValidationError.throwError(Errors.REQUIRED_FIELD, 'title')
      this.title = title
    }
    if (fields.categoryId !== undefined) {
      const categoryId = fields.categoryId.trim()
      if (!categoryId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'categoryId')
      this.categoryId = categoryId
    }
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

  get isDecided(): boolean {
    return this.status === 'settled' || this.status === 'cancelled'
  }

  /**
   * Records the winner of the next unit (map/leg/round/fight — sport-agnostic
   * name, since not every category is "a game") of this bestOf series. Only
   * from `locked`, and only the next unit in order (1, 2, 3…).
   * `winnerParticipantId` must be a participant; `null` declares a draw for
   * that unit — only legal for a bestOf-1 match that `allowsDraw` (a
   * multi-unit series always has a majority winner, so it can never draw).
   * Once a participant reaches the majority of units (`ceil(bestOf / 2)`),
   * the match auto-settles with that participant as the winner — betting-wise
   * a draw is just another selection (`MATCH_DRAW_SELECTION_ID`) that the
   * parimutuel payout settles like any other.
   */
  recordUnitResult(unitNumber: number, winnerParticipantId: string | null, proofImageUrl: string): void {
    if (this.isDecided) ConflictError.throwError(Errors.MATCH_ALREADY_SETTLED, this.status)
    if (this.status !== 'locked') ConflictError.throwError(Errors.INVALID_MATCH_STATUS, this.status)

    const expectedUnitNumber = this.units.length + 1
    if (unitNumber !== expectedUnitNumber) {
      ValidationError.throwError(Errors.INVALID_UNIT_NUMBER, unitNumber)
    }

    if (winnerParticipantId === null) {
      if (!this.allowsDraw) ValidationError.throwError(Errors.DRAW_NOT_ALLOWED, this.id.value)
    } else if (!this.hasParticipant(winnerParticipantId)) {
      ValidationError.throwError(Errors.NOT_A_PARTICIPANT, winnerParticipantId)
    }

    // MatchUnit itself rejects a missing photo for a newly recorded unit.
    this.units.push(new MatchUnit({ matchId: this.id.value, unitNumber, winnerParticipantId, proofImageUrl }))

    if (winnerParticipantId === null) {
      // Only reachable for a bestOf-1 match (allowsDraw already checked above).
      this.applyResult(null)
      return
    }

    const majority = Math.ceil(this.bestOf / 2)
    const unitsWon = this.units.filter((unit) => unit.winnerParticipantId === winnerParticipantId).length
    if (unitsWon >= majority) this.applyResult(winnerParticipantId)
  }

  /** Applies the final result once the bestOf series is decided (won or drawn). */
  private applyResult(winnerParticipantId: string | null): void {
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
