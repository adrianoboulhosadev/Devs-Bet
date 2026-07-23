import { Bet } from '../model'

export type BetOutcomeKind = 'won' | 'lost' | 'refunded'

export interface BetOutcome {
  betId: string
  outcome: BetOutcomeKind
  payout: number // cents (stake back + winnings for winners; stake for refunds; 0 for losers)
}

/**
 * Parimutuel payout (pure, static). The odds come from the distribution of the
 * money, not from a bookmaker:
 *  - pool(participant) = Σ stakes on that participant; total = Σ all stakes.
 *  - distributable = total − rake (rake = total × rakeBasisPoints / 10000).
 *  - a winning bet `i` gets floor(stake_i / pool(winner) × distributable) — so the
 *    winner's implied odd is distributable / pool(winner): the smaller the pool,
 *    the bigger the payout (the underdog pays more).
 *  - if nobody backed the winner (pool == 0) or there is no winner, EVERYONE is
 *    refunded (gets their stake back).
 */
export class PayoutCalculator {
  static calculate(
    bets: Bet[],
    winnerParticipantId: string | null,
    rakeBasisPoints = 0,
  ): BetOutcome[] {
    if (bets.length === 0) return []

    const total = bets.reduce((sum, bet) => sum + bet.stake.cents, 0)
    const winnerPool = winnerParticipantId
      ? bets
          .filter((bet) => bet.participantId === winnerParticipantId)
          .reduce((sum, bet) => sum + bet.stake.cents, 0)
      : 0

    // No winner declared, or nobody backed the winner: refund everyone.
    if (!winnerParticipantId || winnerPool === 0) {
      return bets.map((bet) => ({ betId: bet.id.value, outcome: 'refunded', payout: bet.stake.cents }))
    }

    const rake = Math.floor((total * rakeBasisPoints) / 10_000)
    const distributable = total - rake

    return bets.map((bet) => {
      if (bet.participantId !== winnerParticipantId) {
        return { betId: bet.id.value, outcome: 'lost', payout: 0 }
      }
      const payout = Math.floor((bet.stake.cents * distributable) / winnerPool)
      return { betId: bet.id.value, outcome: 'won', payout }
    })
  }
}
