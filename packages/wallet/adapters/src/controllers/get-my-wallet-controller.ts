import { GetMyWalletQuery, WalletQueryRepository, WalletDTO } from '@wallet/core'

export default class GetMyWalletController {
  constructor(private readonly walletQueryRepository: WalletQueryRepository) {}

  async execute(userId: string): Promise<WalletDTO> {
    const useCase = new GetMyWalletQuery(this.walletQueryRepository)
    return useCase.execute(userId)
  }
}
