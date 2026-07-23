import { Bet } from '../model'

/**
 * Placement WRITE port. `placeBet` is a COMPOSITE atomic operation (cross-context):
 * the adapter reserves the stake on the bettor's wallet (`wallet.hold`, which
 * raises INSUFFICIENT_BALANCE), inserts the bet and writes the ledger entry — all
 * in one `$transaction`. The core stays Prisma/wallet-agnostic.
 */
export interface BettingPlacementRepository {
  placeBet(bet: Bet): Promise<void>
}
