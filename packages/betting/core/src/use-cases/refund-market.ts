import { UseCase } from 'shared'
import { BettingSettlementRepository } from '../providers'

interface Input {
  marketId: string
}

/**
 * Refunds all open bets of a cancelled market (run by the worker off the queue):
 * every bettor gets their stake back (the hold is released). Persisted atomically
 * via the settlement repository.
 */
export default class RefundMarket implements UseCase<Input, void> {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute({ marketId }: Input): Promise<void> {
    const bets = await this.settlementRepository.findOpenBetsByMarket(marketId)
    if (bets.length === 0) return

    for (const bet of bets) bet.refund()

    await this.settlementRepository.applySettlement(bets)
  }
}
