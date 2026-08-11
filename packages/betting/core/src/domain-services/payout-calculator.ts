import { Bet } from '../model'

export type BetOutcomeKind = 'won' | 'lost' | 'refunded'

export interface BetOutcome {
  betId: string
  outcome: BetOutcomeKind
  payout: number // cents (stake back + winnings for winners; stake for refunds; 0 for losers)
}

/**
 * Parimutuel payout (pure, static). The odds come from the distribution of the
 * money, not from a bookmaker — the same math for any market (match winner or
 * tournament champion), grouping by the bet's SELECTION:
 *  - pool(selection) = Σ stakes on that selection; total = Σ all stakes.
 *  - distributable = total − rake (rake = total × rakeBasisPoints / 10000).
 *  - a winning bet `i` gets floor(stake_i / pool(winner) × distributable) — so the
 *    winner's implied odd is distributable / pool(winner): the smaller the pool,
 *    the bigger the payout (the underdog pays more).
 *  - if there is no winner declared (market cancelled), EVERYONE is refunded
 *    (gets their stake back). Same when a winner IS declared but nobody backed
 *    it (pool == 0): with no winning ticket there is nothing to share out, and
 *    consuming everybody's stake would take money that no one won — the classic
 *    parimutuel answer is to give the pool back.
 */
export class PayoutCalculator {
  static calculate(
    bets: Bet[],
    winningSelectionId: string | null,
    rakeBasisPoints = 0,
  ): BetOutcome[] {
    if (bets.length === 0) return []

    // No winner declared (market cancelled): refund everyone.
    if (!winningSelectionId) {
      return bets.map((bet) => ({ betId: bet.id.value, outcome: 'refunded', payout: bet.stake.cents }))
    }

    const total = bets.reduce((sum, bet) => sum + bet.stake.cents, 0)
    const winnerPool = bets
      .filter((bet) => bet.selectionId === winningSelectionId)
      .reduce((sum, bet) => sum + bet.stake.cents, 0)

    // A winner was declared but nobody backed it: there is no one to share the
    // pool with, so it goes back where it came from (same as a cancelled market).
    if (winnerPool === 0) {
      return bets.map((bet) => ({ betId: bet.id.value, outcome: 'refunded', payout: bet.stake.cents }))
    }

    const rake = Math.floor((total * rakeBasisPoints) / 10_000)
    const distributable = total - rake

    return bets.map((bet) => {
      if (bet.selectionId !== winningSelectionId) {
        return { betId: bet.id.value, outcome: 'lost', payout: 0 }
      }
      const payout = Math.floor((bet.stake.cents * distributable) / winnerPool)
      return { betId: bet.id.value, outcome: 'won', payout }
    })
  }
}
