import { Entity, EntityProps, Money, ValidationError, Errors } from 'shared'

export interface WalletProps extends EntityProps {
  userId: string
  balance?: number // cents
  held?: number // cents
}

/**
 * Rich wallet aggregate. Money is kept in cents inside Money value objects. The
 * invariant is enforced by construction and by every mutator: balance and held
 * are never negative and `held` never exceeds `balance` — so `available`
 * (balance − held) is always ≥ 0. Mutators apply a transition and reject illegal
 * states (e.g. holding more than available raises INSUFFICIENT_BALANCE).
 */
export class Wallet extends Entity<Wallet, WalletProps> {
  readonly userId: string
  balance: Money
  held: Money

  constructor(props: WalletProps) {
    super(props)
    this.userId = props.userId
    this.balance = new Money(props.balance ?? 0)
    this.held = new Money(props.held ?? 0)
    // held can never exceed balance (Money.subtract guards the non-negative invariant).
    this.balance.subtract(this.held)
  }

  /** Spendable funds = balance − reserved (held). */
  get available(): Money {
    return this.balance.subtract(this.held)
  }

  /** Credits a confirmed deposit. */
  deposit(amount: Money): void {
    this.balance = this.balance.add(amount)
  }

  /** Reserves funds for a bet or a pending withdrawal. */
  hold(amount: Money): void {
    if (this.available.isLessThan(amount)) {
      ValidationError.throwError(Errors.INSUFFICIENT_BALANCE, amount.cents)
    }
    this.held = this.held.add(amount)
  }

  /** Frees a previous hold (bet cancelled/refunded, withdrawal rejected). */
  release(amount: Money): void {
    this.held = this.held.subtract(amount)
  }

  /** Turns a hold into an actual outflow (bet lost, withdrawal paid). */
  settleHold(amount: Money): void {
    this.held = this.held.subtract(amount)
    this.balance = this.balance.subtract(amount)
  }

  /** Credits winnings (bet won). */
  credit(amount: Money): void {
    this.balance = this.balance.add(amount)
  }
}
