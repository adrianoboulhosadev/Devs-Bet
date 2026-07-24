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
