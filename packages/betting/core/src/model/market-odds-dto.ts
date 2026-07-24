/** Live (indicative) odds for one selection, derived from the current pool. */
export interface SelectionOdds {
  selectionId: string
  pool: number // cents staked on this selection
  bettors: number // distinct bets on this selection
  impliedOdd: number // distributable / pool, 2 decimals (0 if no pool)
}

/**
 * READ model of a market's live odds (CQRS) — a match or a tournament's champion.
 * Indicative while the market is open: odds float with the money and freeze at
 * settlement. `totalPool` is the sum of all stakes; the underdog (smaller pool)
 * shows the higher `impliedOdd`.
 */
export interface MarketOddsDTO {
  marketId: string
  totalPool: number
  entries: SelectionOdds[]
}
