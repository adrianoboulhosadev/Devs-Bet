import { RejectPayment, WalletRepository } from '@wallet/core'
import { AuthenticatedActor } from 'shared'

export default class RejectPaymentController {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new RejectPayment(this.walletRepository)
    await useCase.execute({ paymentId }, actor)
  }
}
