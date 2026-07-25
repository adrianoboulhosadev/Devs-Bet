import { ValidationError, Errors, Entity, EntityProps } from 'shared'

// Rolling 24h window (not calendar-aligned), same reasoning as wallet's DepositLimit.
export const STAKE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

// A raised limit only takes effect after this long — same grace-period rule as
// DepositLimit, so a bettor can't bump their own cap right before an impulsive bet.
const INCREASE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

export interface StakeLimitProps extends EntityProps {
  bettorId: string
  amount: number // cents — the currently EFFECTIVE daily cap
  pendingAmount?: number | null // cents — a scheduled increase, not yet active
  effectiveAt?: Date | null // when pendingAmount takes over
}

/**
 * Self-imposed daily stake cap (responsible gambling) — mirrors wallet's
 * DepositLimit, but a single rolling 24h window (no daily/weekly/monthly
 * choice): `update` applies a lower cap right away and only schedules a
 * higher one; `ensureWithinLimit` is what PlaceBet/PlaceComboBet call to
 * reject a bet that would breach the (possibly just-resolved) cap.
 */
export class StakeLimit extends Entity<StakeLimit, StakeLimitProps> {
  readonly bettorId: string
  amount: number
  pendingAmount: number | null
  effectiveAt: Date | null

  constructor(props: StakeLimitProps) {
    super(props)
    StakeLimit.assertValidAmount(props.amount)
    this.bettorId = props.bettorId
    this.amount = props.amount
    this.pendingAmount = props.pendingAmount ?? null
    this.effectiveAt = props.effectiveAt ?? null
  }

  private static assertValidAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, amount)
    }
  }

  private resolvePending(): void {
    if (this.pendingAmount !== null && this.effectiveAt !== null && this.effectiveAt.getTime() <= Date.now()) {
      this.amount = this.pendingAmount
      this.pendingAmount = null
      this.effectiveAt = null
    }
  }

  /** Sets a new daily cap: lower (or equal) applies now; higher is scheduled. */
  update(newAmount: number): void {
    StakeLimit.assertValidAmount(newAmount)
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

  /** Throws STAKE_LIMIT_EXCEEDED if `stakeAmount` would breach the daily cap,
   * given what the bettor already staked (`usedInWindow`) in the last 24h. */
  ensureWithinLimit(usedInWindow: number, stakeAmount: number): void {
    if (usedInWindow + stakeAmount > this.effectiveAmount()) {
      ValidationError.throwError(Errors.STAKE_LIMIT_EXCEEDED, stakeAmount)
    }
  }
}
