import { StakeLimitDTO } from '../model'

/** Stake limit READ port (query side of CQRS). */
export interface StakeLimitQueryRepository {
  getMyStakeLimitQuery(bettorId: string): Promise<StakeLimitDTO | null>
}
