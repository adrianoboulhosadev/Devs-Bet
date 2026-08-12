import { RequestWithdrawal, WalletRepository } from '@wallet/core'
import { EventPublisher } from 'shared'
import { WithdrawalInput } from '../@types'

export default class RequestWithdrawalController {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: WithdrawalInput, userId: string): Promise<void> {
    const useCase = new RequestWithdrawal(this.walletRepository, this.eventPublisher)
    await useCase.execute({ userId, amount: input.amount })
  }
}
