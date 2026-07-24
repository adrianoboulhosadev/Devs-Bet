import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export type DepositLimitPeriod = 'daily' | 'weekly' | 'monthly'

// Rolling windows (last 24h/7d/30d), not calendar-aligned (no "resets at
// midnight" cliff) — simpler to reason about and no timezone edge cases.
export const PERIOD_WINDOW_MS: Record<DepositLimitPeriod, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
}

// A raised limit only takes effect after this long — stops a user from
// bumping their own cap right before an impulsive deposit. A LOWERED limit
// (or a brand-new one) always applies immediately.
const INCREASE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

export interface DepositLimitProps extends EntityProps {
  userId: string
  period: DepositLimitPeriod
  amount: number // cents — the currently EFFECTIVE cap
  pendingAmount?: number | null // cents — a scheduled increase, not yet active
  effectiveAt?: Date | null // when pendingAmount takes over
}

/**
 * Self-imposed deposit cap (responsible gambling): the user opts to limit how
 * much they can deposit within a rolling window. Rich entity — the grace-period
 * invariant for raising the cap lives here, not in the use case: `update`
 * applies a lower amount right away but only SCHEDULES a higher one
 * (`INCREASE_GRACE_PERIOD_MS` out); `ensureWithinLimit` is what RequestDeposit
 * calls to reject a deposit that would breach the (possibly just-resolved) cap.
 */
export class DepositLimit extends Entity<DepositLimit, DepositLimitProps> {
  readonly userId: string
  readonly period: DepositLimitPeriod
  amount: number
  pendingAmount: number | null
  effectiveAt: Date | null

  constructor(props: DepositLimitProps) {
    super(props)
    DepositLimit.assertValidAmount(props.amount)
    this.userId = props.userId
    this.period = props.period
    this.amount = props.amount
    this.pendingAmount = props.pendingAmount ?? null
    this.effectiveAt = props.effectiveAt ?? null
  }

  private static assertValidAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, amount)
    }
  }

  // Activates a due scheduled increase. Called before every read/mutation so
  // the entity is always self-consistent, regardless of who last touched it.
  private resolvePending(): void {
    if (this.pendingAmount !== null && this.effectiveAt !== null && this.effectiveAt.getTime() <= Date.now()) {
      this.amount = this.pendingAmount
      this.pendingAmount = null
      this.effectiveAt = null
    }
  }

  /** Sets a new cap: lower (or equal) applies now; higher is scheduled. */
  update(newAmount: number): void {
    DepositLimit.assertValidAmount(newAmount)
    this.resolvePending()
    if (newAmount <= this.amount) {
      this.amount = newAmount
      this.pendingAmount = null
      this.effectiveAt = null
      return
    }
    this.pendingAmount = newAmount
    this.effectiveAt = new Date(Date.now() + INCREASE_GRACE_PERIOD_MS)
  }

  /** The cap actually in force right now (resolving any due increase first). */
  effectiveAmount(): number {
    this.resolvePending()
    return this.amount
  }

  /** Throws DEPOSIT_LIMIT_EXCEEDED if `depositAmount` would breach the cap,
   * given what the user already deposited (`usedInWindow`) in this period's
   * current rolling window. */
  ensureWithinLimit(usedInWindow: number, depositAmount: number): void {
    if (usedInWindow + depositAmount > this.effectiveAmount()) {
      ValidationError.throwError(Errors.DEPOSIT_LIMIT_EXCEEDED, this.period)
    }
  }
}
