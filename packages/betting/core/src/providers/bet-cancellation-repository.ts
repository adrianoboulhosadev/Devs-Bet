import { Bet, ComboBet } from '../model'

/**
 * Cancellation WRITE port — the bettor calling their OWN wager off while the
 * market has not closed yet.
 *
 * `cancelBet`/`cancelCombo` are COMPOSITE atomic operations, the mirror image of
 * placement: given the already-refunded aggregate, the adapter releases the hold
 * on the bettor's wallet, updates the bet (and a combo's legs) and writes the
 * `refund` ledger entry — all in one transaction. A cancelled single bet also
 * leaves the market's pool, so the adapter records a fresh odds snapshot the way
 * placing one does.
 */
export interface BetCancellationRepository {
  findBetById(betId: string): Promise<Bet | null>
  cancelBet(bet: Bet): Promise<void>

  findComboBetById(comboBetId: string): Promise<ComboBet | null>
  cancelCombo(combo: ComboBet): Promise<void>
}
