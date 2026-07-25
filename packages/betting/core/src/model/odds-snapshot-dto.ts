/**
 * One point of the odds-history chart: the live odds of a selection at the
 * moment a bet was placed on its market. Recorded append-only by the placement
 * adapter (every PlaceBet — combo legs never touch the pool, so they never
 * generate a point); read-only, no domain rule attached.
 */
export interface OddsSnapshotDTO {
  selectionId: string
  pool: number // cents staked on this selection at this point in time
  totalPool: number // cents staked on the whole market at this point in time
  impliedOdd: number
  recordedAt: Date
}
