import { Entity, EntityProps, ValidationError, Errors } from 'shared'
import { BetMarketType } from './bet'

// pending: market not settled yet. won/lost: the market settled and the picked
// selection did/didn't win. void: the market was cancelled (refunds the whole
// ticket — see ComboBet.resolveLeg).
export type ComboLegResult = 'pending' | 'won' | 'lost' | 'void'

export interface ComboLegProps extends EntityProps {
  comboBetId?: string | null
  // Defaults to 'match' (mirrors Bet).
  marketType?: BetMarketType
  marketId: string
  selectionId: string
  // Decimal odd LOCKED at placement time (the live indicative odd of this
  // selection when the ticket was placed) — fixed from then on, unlike a
  // single bet's parimutuel payout.
  odd: number
  result?: ComboLegResult
}

// A combo is fixed-odds: an odd of 1.00 or less would mean a free/negative
// payout, which makes no sense to lock in.
const MIN_ODD = 1.01

/** One leg of a ComboBet: a market + selection picked at a fixed, pre-locked odd. */
export class ComboLeg extends Entity<ComboLeg, ComboLegProps> {
  readonly comboBetId: string | null
  readonly marketType: BetMarketType
  readonly marketId: string
  readonly selectionId: string
  readonly odd: number
  result: ComboLegResult

  constructor(props: ComboLegProps) {
    super(props)
    if (!Number.isFinite(props.odd) || props.odd < MIN_ODD) {
      ValidationError.throwError(Errors.INVALID_COMBO_ODD, props.odd)
    }
    this.comboBetId = props.comboBetId ?? null
    this.marketType = props.marketType ?? 'match'
    this.marketId = props.marketId
    this.selectionId = props.selectionId
    this.odd = props.odd
    this.result = props.result ?? 'pending'
  }

  get isPending(): boolean {
    return this.result === 'pending'
  }

  resolve(outcome: 'won' | 'lost' | 'void'): void {
    this.result = outcome
  }
}
