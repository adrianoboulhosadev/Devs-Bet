import { SetStakeLimit, StakeLimitRepository } from '@betting/core'
import { SetStakeLimitInput } from '../@types'

export default class SetStakeLimitController {
  constructor(private readonly stakeLimitRepository: StakeLimitRepository) {}

  // bettorId comes from the JWT (HTTP boundary).
  async execute(input: SetStakeLimitInput, bettorId: string): Promise<void> {
    const useCase = new SetStakeLimit(this.stakeLimitRepository)
    await useCase.execute({ bettorId, amount: input.amount })
  }
}
