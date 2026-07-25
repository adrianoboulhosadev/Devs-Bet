import { StakeLimit } from '../model'

/**
 * Responsible-gambling daily stake cap port. Shared by PlaceBet and
 * PlaceComboBet (both need to enforce the same bettor-level budget) and by
 * SetStakeLimit/GetMyStakeLimitQuery.
 */
export interface StakeLimitRepository {
  findStakeLimit(bettorId: string): Promise<StakeLimit | null>
  saveStakeLimit(limit: StakeLimit): Promise<void>
  // Total staked (single bets + combo tickets) since `since` — used to enforce
  // the daily rolling window.
  sumStakedSince(bettorId: string, since: Date): Promise<number>
}
