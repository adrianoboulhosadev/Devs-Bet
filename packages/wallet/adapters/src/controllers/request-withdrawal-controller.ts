import { RequestWithdrawal, WalletRepository } from '@wallet/core'
import { WithdrawalInput } from '../@types'

export default class RequestWithdrawalController {
  constructor(private readonly walletRepository: WalletRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: WithdrawalInput, userId: string): Promise<void> {
    const useCase = new RequestWithdrawal(this.walletRepository)
    await useCase.execute({ userId, amount: input.amount })
  }
}
