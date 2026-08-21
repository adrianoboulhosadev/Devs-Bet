import { Entity, EntityProps, ValidationError, ConflictError, Errors } from 'shared'
import { PollQuestion } from './poll-question'
import { ResolutionCriteria } from './resolution-criteria'
import { PollOption, PollOptionProps } from './poll-option'

// open: taking bets. closed: betting shut, waiting for the world to answer —
// this state can legitimately last weeks (that is the whole point of asking
// "when will X happen?"). settled: an option won. cancelled: refund-all.
export type PollStatus = 'open' | 'closed' | 'settled' | 'cancelled'

export interface PollProps extends EntityProps {
  creatorId: string
  question?: string
  // How the poll gets judged. Required and never editable — see ResolutionCriteria.
  resolutionCriteria?: string
  // Leaf of the category tree this poll belongs to (logical FK). Required.
  categoryId?: string
  imageUrl?: string | null
  // When betting shuts. Required and in the future at creation; the backend
  // schedules the automatic close for this instant.
  closesAt?: Date
  status?: PollStatus
  rakeBasisPoints?: number
  // The option that turned out to be right (set on resolve).
  winningOptionId?: string | null
  options?: PollOptionProps[]
  closedAt?: Date | null
  settledAt?: Date | null
}

// Fewer than two answers is not a question; more than this is a card nobody
// reads and pools too thin to pay anything meaningful.
const MIN_OPTIONS = 2
const MAX_OPTIONS = 10
const MAX_BASIS_POINTS = 10_000

/**
 * Rich poll aggregate: an open question with N answers, each of which bettors
 * can back. Lifecycle `open → closed → settled` (or `→ cancelled`), guarded in
 * the model exactly like a match's.
 *
 * A poll is deliberately NOT a Match with optional fields: it has no
 * participants, no units, no bestOf and no draw, and its result is declared by
 * a human reading the world rather than observed on a scoreboard. What it
 * shares with a match is only what the betting context already knows how to
 * consume — a market id and a set of selection ids.
 *
 * The question, the criteria and the options are frozen at creation: once
 * somebody has money on an answer, rewriting what was asked (or what counts as
 * an answer) changes the deal they took. Getting it wrong is fixed by
 * cancelling — which refunds everyone — and asking again. Only `closesAt` moves.
 */
export class Poll extends Entity<Poll, PollProps> {
  readonly creatorId: string
  readonly question: PollQuestion
  readonly resolutionCriteria: ResolutionCriteria
  readonly categoryId: string
  readonly imageUrl: string | null
  readonly rakeBasisPoints: number
  readonly options: PollOption[]
  closesAt: Date
  status: PollStatus
  winningOptionId: string | null
  closedAt: Date | null
  settledAt: Date | null

  constructor(props: PollProps) {
    super(props)
    this.question = new PollQuestion(props.question)
    this.resolutionCriteria = new ResolutionCriteria(props.resolutionCriteria)

    // Required: the category leaf. Leaf-ness (a cross-context rule) is checked in
    // the use case with data resolved by the app; here we only require the id.
    const categoryId = props.categoryId?.trim() ?? ''
    if (!categoryId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'categoryId')

    // `!props.id` means a brand-new poll (reconstitution from the DB always
    // carries an id) — only then do we reject a past date; a poll whose betting
    // already shut must still reconstitute.
    const closesAt = Poll.requireClosesAt(props.closesAt, !props.id)

    const options = (props.options ?? []).map((option) => new PollOption(option))
    if (options.length < MIN_OPTIONS) {
      ValidationError.throwError(Errors.NOT_ENOUGH_POLL_OPTIONS, options.length, { min: MIN_OPTIONS })
    }
    if (options.length > MAX_OPTIONS) {
      ValidationError.throwError(Errors.TOO_MANY_POLL_OPTIONS, options.length, { max: MAX_OPTIONS })
    }
    const uniqueLabels = new Set(options.map((option) => option.label.comparisonKey))
    if (uniqueLabels.size !== options.length) {
      ValidationError.throwError(Errors.DUPLICATE_POLL_OPTION, options.length)
    }

    const rakeBasisPoints = props.rakeBasisPoints ?? 0
    if (rakeBasisPoints < 0 || rakeBasisPoints > MAX_BASIS_POINTS) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, rakeBasisPoints)
    }

    this.creatorId = props.creatorId
    this.categoryId = categoryId
    this.imageUrl = props.imageUrl ?? null
    this.closesAt = closesAt
    this.rakeBasisPoints = rakeBasisPoints
    this.options = options
    this.status = props.status ?? 'open'
    this.winningOptionId = props.winningOptionId ?? null
    this.closedAt = props.closedAt ?? null
    this.settledAt = props.settledAt ?? null
  }

  // Required closesAt; `enforceFuture` rejects a past date (creation/reschedule)
  // but not reconstitution of a poll that already closed.
  private static requireClosesAt(closesAt: Date | undefined, enforceFuture: boolean): Date {
    if (!(closesAt instanceof Date) || Number.isNaN(closesAt.getTime())) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'closesAt')
    }
    if (enforceFuture && closesAt.getTime() <= Date.now()) {
      ValidationError.throwError(Errors.SCHEDULED_IN_PAST, closesAt.toISOString())
    }
    return closesAt
  }

  get isOpen(): boolean {
    return this.status === 'open'
  }

  get isDecided(): boolean {
    return this.status === 'settled' || this.status === 'cancelled'
  }

  hasOption(optionId: string): boolean {
    return this.options.some((option) => option.id.value === optionId)
  }

  /**
   * Admin moves the deadline — the ONLY mutable detail of a poll, and only while
   * it is still open (see the class comment for why nothing else moves). The
   * caller re-schedules the automatic close afterwards.
   */
  reschedule(closesAt: Date): void {
    if (!this.isOpen) ConflictError.throwError(Errors.POLL_NOT_OPEN, this.status)
    this.closesAt = Poll.requireClosesAt(closesAt, true)
  }

  /**
   * Shuts betting (open → closed). Runs on the schedule, or early by the admin's
   * hand when the answer arrives before the deadline — a poll asking "when will
   * X happen?" is settled by X happening, which does not wait for `closesAt`.
   */
  closeBetting(): void {
    if (!this.isOpen) ConflictError.throwError(Errors.POLL_NOT_OPEN, this.status)
    this.status = 'closed'
    this.closedAt = new Date()
  }

  /**
   * Declares which answer was right (closed → settled). Only from `closed`: the
   * result is never announced while money can still move onto it. The winning
   * option must be one of this poll's own — the payout downstream is the plain
   * parimutuel split of the pool, identical to a match's.
   */
  resolve(winningOptionId: string): void {
    if (this.isDecided) ConflictError.throwError(Errors.POLL_ALREADY_SETTLED, this.status)
    if (this.status !== 'closed') ConflictError.throwError(Errors.INVALID_POLL_STATUS, this.status)
    if (!this.hasOption(winningOptionId)) {
      ValidationError.throwError(Errors.INVALID_POLL_OPTION, winningOptionId)
    }

    this.status = 'settled'
    this.winningOptionId = winningOptionId
    this.settledAt = new Date()
  }

  /**
   * Calls the poll off (refund-all downstream). Not allowed once settled. This
   * is the exit for a question the world never answered — the deadline passed
   * and nothing happened — and for one asked wrong: everyone gets their stake
   * back, which is why the question itself never needs to be editable.
   */
  cancel(): void {
    if (this.status === 'settled') ConflictError.throwError(Errors.POLL_ALREADY_SETTLED, this.status)
    this.status = 'cancelled'
  }
}
