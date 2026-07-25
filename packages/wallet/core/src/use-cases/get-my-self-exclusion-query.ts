import { UseCase } from 'shared'
import { SelfExclusionDTO } from '../model'
import { WalletQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated user's current self-exclusion, if any. */
export default class GetMySelfExclusionQuery implements UseCase<string, SelfExclusionDTO | null> {
  constructor(private readonly walletQueryRepository: WalletQueryRepository) {}

  async execute(userId: string): Promise<SelfExclusionDTO | null> {
    return this.walletQueryRepository.findActiveSelfExclusionQuery(userId)
  }
}
