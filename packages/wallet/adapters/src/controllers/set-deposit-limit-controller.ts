import { SetDepositLimit, WalletRepository } from '@wallet/core'
import { SetDepositLimitInput } from '../@types'

export default class SetDepositLimitController {
  constructor(private readonly walletRepository: WalletRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: SetDepositLimitInput, userId: string): Promise<void> {
    const useCase = new SetDepositLimit(this.walletRepository)
    await useCase.execute({ userId, period: input.period, amount: input.amount })
  }
}
