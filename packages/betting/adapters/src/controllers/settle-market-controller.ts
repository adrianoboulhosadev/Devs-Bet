import { SettleMarket, RefundMarket, BettingSettlementRepository, SettlementJob } from '@betting/core'

/**
 * Runs the settlement (worker side) for any market. Refunds everyone when the
 * market was cancelled; otherwise pays out the parimutuel result.
 */
export default class SettleMarketController {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute(job: SettlementJob): Promise<void> {
    if (job.cancelled) {
      await new RefundMarket(this.settlementRepository).execute({ marketId: job.marketId })
      return
    }
    await new SettleMarket(this.settlementRepository).execute({
      marketId: job.marketId,
      winningSelectionId: job.winningSelectionId,
      rakeBasisPoints: job.rakeBasisPoints,
    })
  }
}
