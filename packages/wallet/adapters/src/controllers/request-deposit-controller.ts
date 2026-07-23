import { RequestDeposit, WalletRepository } from '@wallet/core'
import { DepositInput } from '../@types'

export default class RequestDepositController {
  constructor(private readonly walletRepository: WalletRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: DepositInput, userId: string): Promise<void> {
    const useCase = new RequestDeposit(this.walletRepository)
    await useCase.execute({ userId, amount: input.amount })
  }
}
