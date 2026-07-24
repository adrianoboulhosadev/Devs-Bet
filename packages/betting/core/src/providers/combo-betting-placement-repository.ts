import { ComboBet } from '../model'

/**
 * Combo placement WRITE port. `placeCombo` is a COMPOSITE atomic operation
 * (mirrors BettingPlacementRepository.placeBet): the adapter reserves the stake
 * on the bettor's wallet (`wallet.hold`), inserts the combo bet + its legs, and
 * writes the `bet_hold` ledger entry — all in one `$transaction`.
 */
export interface ComboBettingPlacementRepository {
  placeCombo(combo: ComboBet): Promise<void>
}
