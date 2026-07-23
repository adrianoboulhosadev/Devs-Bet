import { ConfirmDeposit, WalletRepository } from '@wallet/core'
import { AuthenticatedActor } from 'shared'

export default class ConfirmDepositController {
  constructor(private readonly walletRepository: WalletRepository) {}

  // The admin actor comes from the JWT; the role guard is re-checked in the use case.
  async execute(paymentId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new ConfirmDeposit(this.walletRepository)
    await useCase.execute({ paymentId }, actor)
  }
}
