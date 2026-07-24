import { UseCase } from 'shared'
import { BettingSettlementRepository } from '../providers'

interface Input {
  marketId: string
}

/**
 * Refunds all open bets of a cancelled market (run by the worker off the queue):
 * every bettor gets their stake back (the hold is released). Persisted atomically
 * via the settlement repository. Also voids any combo (parlay) ticket with a leg
 * on this market — ComboBet.resolveLeg refunds the whole ticket once every leg
 * is resolved (a void leg is never stripped out to recompute a lower odd).
 */
export default class RefundMarket implements UseCase<Input, void> {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute({ marketId }: Input): Promise<void> {
    const bets = await this.settlementRepository.findOpenBetsByMarket(marketId)
    if (bets.length > 0) {
      for (const bet of bets) bet.refund()
      await this.settlementRepository.applySettlement(bets)
    }

    const combos = await this.settlementRepository.findComboBetsWithOpenLegByMarket(marketId)
    if (combos.length > 0) {
      for (const combo of combos) combo.resolveLeg(marketId, 'void')
      await this.settlementRepository.applyComboSettlement(combos)
    }
  }
}
