import { StartSelfExclusion, WalletRepository } from '@wallet/core'
import { StartSelfExclusionInput } from '../@types'

export default class StartSelfExclusionController {
  constructor(private readonly walletRepository: WalletRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: StartSelfExclusionInput, userId: string): Promise<void> {
    const useCase = new StartSelfExclusion(this.walletRepository)
    await useCase.execute({ userId, period: input.period })
  }
}
