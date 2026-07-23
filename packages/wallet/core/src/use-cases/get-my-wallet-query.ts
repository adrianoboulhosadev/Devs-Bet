import { UseCase } from 'shared'
import { WalletDTO } from '../model'
import { WalletQueryRepository } from '../providers'

/**
 * Read side (CQRS): the authenticated user's wallet. If the wallet has not been
 * provisioned yet (no deposit ever confirmed), returns a zeroed projection.
 */
export default class GetMyWalletQuery implements UseCase<string, WalletDTO> {
  constructor(private readonly walletQueryRepository: WalletQueryRepository) {}

  async execute(userId: string): Promise<WalletDTO> {
    const wallet = await this.walletQueryRepository.findByUserIdQuery(userId)
    return wallet ?? { userId, balance: 0, held: 0, available: 0, currency: 'BRL' }
  }
}
