import { Entity, EntityProps, Money, ValidationError, Errors } from 'shared'
import { BetStatus } from './bet'
import { ComboLeg, ComboLegProps } from './combo-leg'

export interface ComboBetProps extends EntityProps {
  bettorId: string
  legs: ComboLegProps[]
  stake: number // cents
  status?: BetStatus
  payout?: number // cents (0 until settled)
  settledAt?: Date | null
}

// A "combo" needs at least two legs — a single leg is just a normal Bet
// (already covered by the parimutuel single-market flow).
const MIN_COMBO_LEGS = 2

/**
 * Rich combo (parlay/accumulator) bet: fixed odds, the SAME calculation real
 * bookmakers use — unlike the parimutuel single Bet, whose payout only exists
 * at settlement from the market's pool. Each leg locks the live indicative odd
 * of its market at placement time; `totalOdd` is their product, and the payout
 * (if every leg wins) is `stake * totalOdd` — fixed from the moment the ticket
 * is placed, regardless of what the underlying markets' pools do afterwards.
 * Legs never touch those pools — a combo is a parallel, house-priced wager.
 */
export class ComboBet extends Entity<ComboBet, ComboBetProps> {
  readonly bettorId: string
  readonly legs: ComboLeg[]
  readonly stake: Money
  readonly totalOdd: number
  status: BetStatus
  payout: Money
  settledAt: Date | null

  constructor(props: ComboBetProps) {
    super(props)
    this.stake = new Money(props.stake)
    if (this.stake.isZero()) ValidationError.throwError(Errors.INVALID_STAKE, props.stake)

    const legs = (props.legs ?? []).map(
      (leg) => new ComboLeg({ ...leg, comboBetId: leg.comboBetId ?? this.id.value }),
    )
    if (legs.length < MIN_COMBO_LEGS) {
      ValidationError.throwError(Errors.INVALID_COMBO_LEGS, legs.length)
    }
    const marketIds = new Set(legs.map((leg) => leg.marketId))
    if (marketIds.size !== legs.length) {
      ValidationError.throwError(Errors.DUPLICATE_COMBO_MARKET, legs.length)
    }

    this.bettorId = props.bettorId
    this.legs = legs
    this.totalOdd = Math.round(legs.reduce((product, leg) => product * leg.odd, 1) * 100) / 100
    this.status = props.status ?? 'open'
    this.payout = new Money(props.payout ?? 0)
    this.settledAt = props.settledAt ?? null
  }

  /**
   * Resolves the leg targeting `marketId` (won/lost/void, decided by the
   * settlement of that underlying market) and re-evaluates the ticket — exactly
   * how a bookmaker's accumulator behaves:
   *  - one lost leg kills the whole ticket immediately, even if other legs are
   *    still pending (no point waiting for the rest);
   *  - once every leg is resolved, any void leg (its market was cancelled)
   *    refunds the ticket in full — a simplification: the leg is not stripped
   *    out and the odd is not recalculated, unlike some real sportsbooks;
   *  - otherwise (every leg won) the ticket pays `stake * totalOdd`.
   * No-op once the ticket already settled, or if no pending leg matches
   * `marketId` — safe to call more than once (idempotent, like AutoLockMatch).
   */
  resolveLeg(marketId: string, outcome: 'won' | 'lost' | 'void'): void {
    if (this.status !== 'open') return
    const leg = this.legs.find((candidate) => candidate.marketId === marketId && candidate.isPending)
    if (!leg) return
    leg.resolve(outcome)

    if (this.legs.some((candidate) => candidate.result === 'lost')) {
      this.status = 'lost'
      this.payout = Money.zero()
      this.settledAt = new Date()
      return
    }
    if (this.legs.some((candidate) => candidate.isPending)) return

    if (this.legs.some((candidate) => candidate.result === 'void')) {
      this.status = 'refunded'
      this.payout = this.stake
    } else {
      this.status = 'won'
      this.payout = this.stake.multiply(this.totalOdd)
    }
    this.settledAt = new Date()
  }
}
