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
 *
 * Also resolves any combo (parlay) ticket with a leg on this market: fixed-odds,
 * so it never touches the parimutuel pool above — a leg just wins or loses
 * against the same winningSelectionId.
 */
export default class SettleMarket implements UseCase<Input, void> {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute({ marketId, winningSelectionId, rakeBasisPoints = 0 }: Input): Promise<void> {
    const bets = await this.settlementRepository.findOpenBetsByMarket(marketId)
    if (bets.length > 0) {
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

    const combos = await this.settlementRepository.findComboBetsWithOpenLegByMarket(marketId)
    if (combos.length > 0) {
      for (const combo of combos) {
        const leg = combo.legs.find((candidate) => candidate.marketId === marketId)!
        combo.resolveLeg(marketId, leg.selectionId === winningSelectionId ? 'won' : 'lost')
      }
      await this.settlementRepository.applyComboSettlement(combos)
    }
  }
}
