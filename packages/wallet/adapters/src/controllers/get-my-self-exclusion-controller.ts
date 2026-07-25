import { GetMySelfExclusionQuery, WalletQueryRepository, SelfExclusionDTO } from '@wallet/core'

export default class GetMySelfExclusionController {
  constructor(private readonly walletQueryRepository: WalletQueryRepository) {}

  async execute(userId: string): Promise<SelfExclusionDTO | null> {
    return new GetMySelfExclusionQuery(this.walletQueryRepository).execute(userId)
  }
}
