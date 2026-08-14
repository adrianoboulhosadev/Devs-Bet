import { DomainEvent } from 'shared'

/**
 * Raised directly by `RequestDeposit`/`RequestWithdrawal` (not via
 * `AggregateRoot.record`) — pure creation, the use case already knows every
 * fact. Reaches every admin: it is what shows up in the control room's queue.
 * No `paymentId`-based dedup needed on the notification side: each new request
 * IS a genuinely new event, never a repeat of a past one.
 */
export class DepositRequested extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly userId: string,
    readonly amount: number,
  ) {
    super()
  }
}

export class WithdrawalRequested extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly userId: string,
    readonly amount: number,
  ) {
    super()
  }
}

/** Raised by `Payment.confirm()` — a deposit was received and credited. */
export class DepositConfirmed extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly userId: string,
    readonly amount: number,
  ) {
    super()
  }
}

/** Raised by `Payment.markPaid()` — a withdrawal was effectively paid out. */
export class WithdrawalPaid extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly userId: string,
    readonly amount: number,
  ) {
    super()
  }
}

/**
 * Raised by `Payment.reject()`, for either direction — carries `direction` so
 * whoever turns this into a notification does not have to re-fetch the
 * payment just to pick between "deposit rejected" and "withdrawal rejected".
 * `reason` is always set for a withdrawal (the domain requires it); a
 * deposit's stays optional, same as before.
 */
export class PaymentRejected extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly userId: string,
    readonly amount: number,
    readonly direction: 'deposit' | 'withdrawal',
    readonly reason: string | null,
  ) {
    super()
  }
}
