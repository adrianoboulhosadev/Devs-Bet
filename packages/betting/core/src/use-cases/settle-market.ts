import { UseCase, Money } from 'shared'
import { PayoutCalculator } from '../domain-services'
import { BettingSettlementRepository } from '../providers'

interface Input {
  marketId: string
  winningSelectionId: string | null
  rakeBasisPoints?: number
}

/**
 * Settles all open bets of a market (run by the worker off the queue) — a match's
 * winner or a tournament's champion. Computes the parimutuel outcomes with
 * PayoutCalculator, applies them to the Bet entities (guarded transitions) and
 * persists everything atomically via the settlement repository (which also moves
 * the wallets). Nobody backed the winner → everyone loses (no refund); a
 * cancelled market never reaches here — that's RefundMarket's job.
 */
export default class SettleMarket implements UseCase<Input, void> {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute({ marketId, winningSelectionId, rakeBasisPoints = 0 }: Input): Promise<void> {
    const bets = await this.settlementRepository.findOpenBetsByMarket(marketId)
    if (bets.length === 0) return

    const outcomes = PayoutCalculator.calculate(bets, winningSelectionId, rakeBasisPoints)
    const betsById = new Map(bets.map((bet) => [bet.id.value, bet]))

    for (const outcome of outcomes) {
      const bet = betsById.get(outcome.betId)!
      if (outcome.outcome === 'won') bet.settleAsWinner(new Money(outcome.payout))
      else if (outcome.outcome === 'lost') bet.settleAsLoser()
      else bet.refund()
    }

    await this.settlementRepository.applySettlement(bets)
  }
}
