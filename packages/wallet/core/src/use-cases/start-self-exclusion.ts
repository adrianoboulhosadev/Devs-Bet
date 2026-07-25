import { UseCase, ConflictError, Errors } from 'shared'
import { SelfExclusion, SelfExclusionPeriod } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  userId: string
  period: SelfExclusionPeriod
}

/**
 * Self-service: the user opts to block themselves from depositing/betting.
 * Rejects starting a new one while another is already active (ALREADY_SELF_EXCLUDED)
 * — extending/shortening isn't offered in this v1, the whole point is that the
 * user can't touch it once it's running.
 */
export default class StartSelfExclusion implements UseCase<Input, void> {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId, period }: Input): Promise<void> {
    const existing = await this.walletRepository.findActiveSelfExclusion(userId)
    if (existing && existing.isActive) {
      ConflictError.throwError(Errors.ALREADY_SELF_EXCLUDED, userId)
    }

    const exclusion = SelfExclusion.start(userId, period)
    await this.walletRepository.saveSelfExclusion(exclusion)
  }
}
