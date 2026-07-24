import { UseCase } from 'shared'
import { DepositLimit, DepositLimitPeriod } from '../model'
import { WalletRepository } from '../providers'

interface Input {
  userId: string
  period: DepositLimitPeriod
  amount: number // cents
}

/**
 * Self-service: the user sets (or adjusts) their own deposit cap for a period.
 * A brand-new cap, or a lower one, applies immediately; DepositLimit.update
 * itself schedules a higher one behind the grace period — this use case just
 * orchestrates load -> mutate -> persist.
 */
export default class SetDepositLimit implements UseCase<Input, void> {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute({ userId, period, amount }: Input): Promise<void> {
    const existing = await this.walletRepository.findDepositLimit(userId, period)

    if (existing) {
      existing.update(amount)
      await this.walletRepository.saveDepositLimit(existing)
      return
    }

    const limit = new DepositLimit({ userId, period, amount })
    await this.walletRepository.saveDepositLimit(limit)
  }
}
