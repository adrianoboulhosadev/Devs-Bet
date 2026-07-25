import { UseCase } from 'shared'
import { StakeLimit } from '../model'
import { StakeLimitRepository } from '../providers'

interface Input {
  bettorId: string
  amount: number // cents
}

/**
 * Self-service: the bettor sets (or adjusts) their own daily stake cap. A
 * brand-new cap, or a lower one, applies immediately; StakeLimit.update itself
 * schedules a higher one behind the grace period.
 */
export default class SetStakeLimit implements UseCase<Input, void> {
  constructor(private readonly stakeLimitRepository: StakeLimitRepository) {}

  async execute({ bettorId, amount }: Input): Promise<void> {
    const existing = await this.stakeLimitRepository.findStakeLimit(bettorId)

    if (existing) {
      existing.update(amount)
      await this.stakeLimitRepository.saveStakeLimit(existing)
      return
    }

    const limit = new StakeLimit({ bettorId, amount })
    await this.stakeLimitRepository.saveStakeLimit(limit)
  }
}
