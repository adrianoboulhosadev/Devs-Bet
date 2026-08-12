import { AggregateRoot, EntityProps, Money, ConflictError, ValidationError, Errors } from 'shared'
import { BetWon, BetLost, BetRefunded } from './events'

// open: still live. won/lost/refunded: terminal after settlement.
export type BetStatus = 'open' | 'won' | 'lost' | 'refunded'

// What the bet is on: a single match (pick the winner of a confrontation) or a
// tournament's champion (outright / futures — much harder, pays more).
export type BetMarketType = 'match' | 'tournament_outright'

export interface BetProps extends EntityProps {
  // Defaults to 'match' (the original, most common market).
  marketType?: BetMarketType
  // The market this bet belongs to: a match id or a tournament id (logical FK).
  // Settlement groups all open bets of a market by this id.
  marketId: string
  bettorId: string
  // The chosen option within the market: a match participant id or a tournament
  // participant id. The parimutuel pool is split by selection.
  selectionId: string
  stake: number // cents
  status?: BetStatus
  payout?: number // cents (0 until settled)
  settledAt?: Date | null
}

/**
 * Rich bet entity. A bet targets a MARKET (a match, or a tournament's champion)
 * and picks one SELECTION inside it. The stake is validated (> 0) at construction.
 * Settlement transitions are guarded: a bet can only be resolved from `open`,
 * otherwise MATCH_ALREADY_SETTLED — the payout is the parimutuel share computed by
 * the PayoutCalculator (identical math for every market type).
 */
export class Bet extends AggregateRoot<Bet, BetProps> {
  readonly marketType: BetMarketType
  readonly marketId: string
  readonly bettorId: string
  readonly selectionId: string
  readonly stake: Money
  status: BetStatus
  payout: Money
  settledAt: Date | null

  constructor(props: BetProps) {
    super(props)
    this.stake = new Money(props.stake)
    if (this.stake.isZero()) ValidationError.throwError(Errors.INVALID_STAKE, props.stake)
    this.marketType = props.marketType ?? 'match'
    this.marketId = props.marketId
    this.bettorId = props.bettorId
    this.selectionId = props.selectionId
    this.status = props.status ?? 'open'
    this.payout = new Money(props.payout ?? 0)
    this.settledAt = props.settledAt ?? null
  }

  private ensureOpen(): void {
    if (this.status !== 'open') ConflictError.throwError(Errors.MATCH_ALREADY_SETTLED, this.status)
  }

  settleAsWinner(payout: Money): void {
    this.ensureOpen()
    this.status = 'won'
    this.payout = payout
    this.settledAt = new Date()
    this.record(new BetWon(this.id.value, this.bettorId, this.marketType, this.marketId, this.payout.cents))
  }

  settleAsLoser(): void {
    this.ensureOpen()
    this.status = 'lost'
    this.payout = Money.zero()
    this.settledAt = new Date()
    this.record(new BetLost(this.id.value, this.bettorId, this.marketType, this.marketId, this.stake.cents))
  }

  refund(): void {
    this.ensureOpen()
    this.status = 'refunded'
    this.payout = this.stake
    this.settledAt = new Date()
    this.record(new BetRefunded(this.id.value, this.bettorId, this.marketType, this.marketId, this.stake.cents))
  }
}
