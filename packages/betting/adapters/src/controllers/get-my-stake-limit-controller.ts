import { GetMyStakeLimitQuery, StakeLimitQueryRepository, StakeLimitDTO } from '@betting/core'

export default class GetMyStakeLimitController {
  constructor(private readonly stakeLimitQueryRepository: StakeLimitQueryRepository) {}

  async execute(bettorId: string): Promise<StakeLimitDTO | null> {
    return new GetMyStakeLimitQuery(this.stakeLimitQueryRepository).execute(bettorId)
  }
}
