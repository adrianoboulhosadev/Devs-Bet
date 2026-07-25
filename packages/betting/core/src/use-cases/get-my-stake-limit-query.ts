import { UseCase } from 'shared'
import { StakeLimitDTO } from '../model'
import { StakeLimitQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated bettor's own daily stake cap, if set. */
export default class GetMyStakeLimitQuery implements UseCase<string, StakeLimitDTO | null> {
  constructor(private readonly stakeLimitQueryRepository: StakeLimitQueryRepository) {}

  async execute(bettorId: string): Promise<StakeLimitDTO | null> {
    return this.stakeLimitQueryRepository.getMyStakeLimitQuery(bettorId)
  }
}
