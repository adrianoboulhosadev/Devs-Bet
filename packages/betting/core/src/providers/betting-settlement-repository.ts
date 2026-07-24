import { Bet, ComboBet } from '../model'

/**
 * Settlement WRITE port. `applySettlement` is a COMPOSITE atomic operation: given
 * the already-resolved bets (each with its final status/payout), the adapter, in
 * one `$transaction`, updates every bet and applies the matching wallet effect
 * (winner → release stake + credit winnings; loser → settle the hold; refunded →
 * release the hold) plus the ledger entries. The core computed the outcomes; the
 * adapter owns the atomicity and the wallet arithmetic. Works for any market.
 *
 * The combo (parlay) side mirrors this for tickets with a still-open leg on the
 * settling market: `findComboBetsWithOpenLegByMarket` brings them back (whatever
 * their overall status), the use case resolves that leg (ComboBet.resolveLeg)
 * and `applyComboSettlement` persists every leg's result — applying the wallet
 * effect only for tickets that just became won/lost/refunded (a ticket with
 * other legs still pending stays `open`, no money movement yet).
 */
export interface BettingSettlementRepository {
  findOpenBetsByMarket(marketId: string): Promise<Bet[]>
  applySettlement(bets: Bet[]): Promise<void>
  findComboBetsWithOpenLegByMarket(marketId: string): Promise<ComboBet[]>
  applyComboSettlement(combos: ComboBet[]): Promise<void>
}
