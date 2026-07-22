import { ValidationError } from '../errors/validation-error'
import { Errors } from '../constants/errors'

/**
 * Money value object. Stored as integer CENTS (never float) to avoid rounding
 * drift — the whole project moves money in cents. Immutable: every operation
 * returns a new Money. It guarantees a NON-NEGATIVE amount; a subtraction that
 * would go below zero throws INVALID_AMOUNT — the caller (e.g. Wallet) must
 * check availability first and raise the domain-specific error (INSUFFICIENT_BALANCE).
 */
export class Money {
  readonly cents: number

  constructor(cents: number) {
    if (!Number.isInteger(cents) || !Number.isFinite(cents) || cents < 0) {
      ValidationError.throwError(Errors.INVALID_AMOUNT, cents)
    }
    this.cents = cents
  }

  static fromReais(reais: number): Money {
    return new Money(Math.round(reais * 100))
  }

  static zero(): Money {
    return new Money(0)
  }

  get reais(): number {
    return this.cents / 100
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents)
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents)
  }

  /** Multiplies by a factor and rounds to the nearest cent (used by the payout share). */
  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor))
  }

  isZero(): boolean {
    return this.cents === 0
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.cents >= other.cents
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents
  }

  equals(other?: Money): boolean {
    return !!other && this.cents === other.cents
  }
}
