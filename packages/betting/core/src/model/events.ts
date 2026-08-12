import { DomainEvent } from 'shared'
import { BetMarketType } from './bet'

/**
 * Raised by `Bet.settleAsWinner/settleAsLoser/refund` — the settlement path
 * (SettleMarket/RefundMarket) pulls these from every processed bet. `CancelBet`
 * (a bettor pulling out of their OWN open bet) calls `refund()` too and this
 * still gets recorded, but nothing ever pulls it there — a self-cancel already
 * has its own toast, a notification would just be noise.
 */
export class BetWon extends DomainEvent {
  constructor(
    readonly betId: string,
    readonly bettorId: string,
    readonly marketType: BetMarketType,
    readonly marketId: string,
    readonly payout: number,
  ) {
    super()
  }
}

export class BetLost extends DomainEvent {
  constructor(
    readonly betId: string,
    readonly bettorId: string,
    readonly marketType: BetMarketType,
    readonly marketId: string,
    readonly stake: number,
  ) {
    super()
  }
}

export class BetRefunded extends DomainEvent {
  constructor(
    readonly betId: string,
    readonly bettorId: string,
    readonly marketType: BetMarketType,
    readonly marketId: string,
    readonly stake: number,
  ) {
    super()
  }
}

/**
 * Raised by `ComboBet.resolveLeg` — only when the TICKET (not just the one leg)
 * reaches a final status this round; a leg resolving under an otherwise-open
 * ticket is not news yet. `ComboBet.cancel()` (the bettor's own self-service
 * pull-out) never raises one of these — same reasoning as BetRefunded.
 */
export class ComboWon extends DomainEvent {
  constructor(
    readonly comboBetId: string,
    readonly bettorId: string,
    readonly legs: number,
    readonly payout: number,
  ) {
    super()
  }
}

export class ComboLost extends DomainEvent {
  constructor(
    readonly comboBetId: string,
    readonly bettorId: string,
    readonly legs: number,
    readonly stake: number,
  ) {
    super()
  }
}

export class ComboRefunded extends DomainEvent {
  constructor(
    readonly comboBetId: string,
    readonly bettorId: string,
    readonly legs: number,
    readonly stake: number,
  ) {
    super()
  }
}
