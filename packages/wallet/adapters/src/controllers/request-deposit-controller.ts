import { RequestDeposit, WalletRepository } from '@wallet/core'
import { EventPublisher } from 'shared'
import { DepositInput } from '../@types'

export default class RequestDepositController {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: DepositInput, userId: string): Promise<void> {
    const useCase = new RequestDeposit(this.walletRepository, this.eventPublisher)
    await useCase.execute({ userId, amount: input.amount, receiptUrl: input.receiptUrl })
  }
}
