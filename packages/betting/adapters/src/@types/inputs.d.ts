import type { BetMarketType } from '@betting/core'

/** Stake in CENTS. bettorId comes from the JWT; the market's openness and valid
 * selections are resolved from the owning context (match/tournament) by the
 * backend, not sent by the client. */
export interface PlaceBetInput {
  marketType: BetMarketType
  // The market: a match id or a tournament id.
  marketId: string
  // The picked selection: a match participant id or a tournament participant id.
  selectionId: string
  stake: number
}

/** One leg of a combo ticket, as sent by the client — just the pick. The odd
 * (fixed-price, locked at placement) and the market's openness/valid selections
 * are resolved server-side, same as a single bet. */
export interface ComboBetLegInput {
  marketType: BetMarketType
  marketId: string
  selectionId: string
}

/** Wire input for POST /bet/combo. Stake in CENTS; bettorId comes from the JWT. */
export interface PlaceComboBetInput {
  stake: number
  legs: ComboBetLegInput[]
}

/** A combo leg after the backend resolved its market data + current indicative
 * odd — what the facade/controller pass down to the PlaceComboBet use case. */
export interface PlaceComboBetLegInput extends ComboBetLegInput {
  odd: number
  marketOpen: boolean
  selectionIds: string[]
}
