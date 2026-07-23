import { Entity, EntityProps, Money, ConflictError, ValidationError, Errors } from 'shared'

// open: still live. won/lost/refunded: terminal after settlement.
export type BetStatus = 'open' | 'won' | 'lost' | 'refunded'

export interface BetProps extends EntityProps {
  matchId: string
  bettorId: string
  participantId: string
  stake: number // cents
  status?: BetStatus
  payout?: number // cents (0 until settled)
  settledAt?: Date | null
}

/**
 * Rich bet entity. The stake is validated (> 0) at construction. Settlement
 * transitions are guarded: a bet can only be resolved from `open`, otherwise
 * MATCH_ALREADY_SETTLED — the payout is the parimutuel share computed by the
 * PayoutCalculator.
 */
export class Bet extends Entity<Bet, BetProps> {
  readonly matchId: string
  readonly bettorId: string
  readonly participantId: string
  readonly stake: Money
  status: BetStatus
  payout: Money
  settledAt: Date | null

  constructor(props: BetProps) {
    super(props)
    this.stake = new Money(props.stake)
    if (this.stake.isZero()) ValidationError.throwError(Errors.INVALID_STAKE, props.stake)
    this.matchId = props.matchId
    this.bettorId = props.bettorId
    this.participantId = props.participantId
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
  }

  settleAsLoser(): void {
    this.ensureOpen()
    this.status = 'lost'
    this.payout = Money.zero()
    this.settledAt = new Date()
  }

  refund(): void {
    this.ensureOpen()
    this.status = 'refunded'
    this.payout = this.stake
    this.settledAt = new Date()
  }
}
