import { RejectPayment, WalletRepository } from '@wallet/core'
import { AuthenticatedActor, EventPublisher } from 'shared'

export default class RejectPaymentController {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(paymentId: string, reason: string | undefined, actor: AuthenticatedActor): Promise<void> {
    const useCase = new RejectPayment(this.walletRepository, this.eventPublisher)
    await useCase.execute({ paymentId, reason }, actor)
  }
}
