import { Bet } from '../model'

/**
 * Settlement WRITE port. `applySettlement` is a COMPOSITE atomic operation: given
 * the already-resolved bets (each with its final status/payout), the adapter, in
 * one `$transaction`, updates every bet and applies the matching wallet effect
 * (winner → release stake + credit winnings; loser → settle the hold; refunded →
 * release the hold) plus the ledger entries. The core computed the outcomes; the
 * adapter owns the atomicity and the wallet arithmetic.
 */
export interface BettingSettlementRepository {
  findOpenBetsByMatch(matchId: string): Promise<Bet[]>
  applySettlement(bets: Bet[]): Promise<void>
}
