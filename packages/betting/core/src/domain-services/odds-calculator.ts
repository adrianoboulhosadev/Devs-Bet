import { Bet } from '../model'
import { MarketOddsDTO, SelectionOdds } from '../model'

/**
 * Live (indicative) odds from the current open bets of a market (pure, static).
 * Groups the stakes by selection and derives the implied odd = distributable /
 * pool. These float while the market is open and are only indicative — settlement
 * uses the final pool via the PayoutCalculator. Works for any market (a match or a
 * tournament's champion).
 */
export class OddsCalculator {
  static calculate(marketId: string, bets: Bet[], rakeBasisPoints = 0): MarketOddsDTO {
    const total = bets.reduce((sum, bet) => sum + bet.stake.cents, 0)
    const rake = Math.floor((total * rakeBasisPoints) / 10_000)
    const distributable = total - rake

    const bySelection = new Map<string, { pool: number; bettors: number }>()
    for (const bet of bets) {
      const current = bySelection.get(bet.selectionId) ?? { pool: 0, bettors: 0 }
      current.pool += bet.stake.cents
      current.bettors += 1
      bySelection.set(bet.selectionId, current)
    }

    const entries: SelectionOdds[] = [...bySelection.entries()].map(([selectionId, data]) => ({
      selectionId,
      pool: data.pool,
      bettors: data.bettors,
      impliedOdd: data.pool === 0 ? 0 : Math.round((distributable / data.pool) * 100) / 100,
    }))

    return { marketId, totalPool: total, entries }
  }
}
