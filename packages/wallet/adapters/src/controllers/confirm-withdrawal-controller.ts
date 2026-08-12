import { ConfirmWithdrawal, WalletRepository } from '@wallet/core'
import { AuthenticatedActor, EventPublisher } from 'shared'

export default class ConfirmWithdrawalController {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new ConfirmWithdrawal(this.walletRepository, this.eventPublisher)
    await useCase.execute({ paymentId }, actor)
  }
}
