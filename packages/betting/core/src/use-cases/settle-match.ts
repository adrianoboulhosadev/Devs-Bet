import { UseCase, Money } from 'shared'
import { PayoutCalculator } from '../domain-services'
import { BettingSettlementRepository } from '../providers'

interface Input {
  matchId: string
  winnerParticipantId: string | null
  rakeBasisPoints?: number
}

/**
 * Settles all open bets of a match (run by the worker off the queue). Computes the
 * parimutuel outcomes with PayoutCalculator, applies them to the Bet entities
 * (guarded transitions) and persists everything atomically via the settlement
 * repository (which also moves the wallets). No winner / empty winner pool →
 * everyone refunded (handled by the calculator).
 */
export default class SettleMatch implements UseCase<Input, void> {
  constructor(private readonly settlementRepository: BettingSettlementRepository) {}

  async execute({ matchId, winnerParticipantId, rakeBasisPoints = 0 }: Input): Promise<void> {
    const bets = await this.settlementRepository.findOpenBetsByMatch(matchId)
    if (bets.length === 0) return

    const outcomes = PayoutCalculator.calculate(bets, winnerParticipantId, rakeBasisPoints)
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
