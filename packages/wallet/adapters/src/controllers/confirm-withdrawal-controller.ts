import { ConfirmWithdrawal, WalletRepository } from '@wallet/core'
import { AuthenticatedActor } from 'shared'

export default class ConfirmWithdrawalController {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new ConfirmWithdrawal(this.walletRepository)
    await useCase.execute({ paymentId }, actor)
  }
}
