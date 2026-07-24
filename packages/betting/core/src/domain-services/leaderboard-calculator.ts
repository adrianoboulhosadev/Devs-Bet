import { Bet } from '../model'
import { LeaderboardEntryDTO } from '../model'

/**
 * Bettor ranking from settled bets (pure/static). Refunded bets are a wash (payout
 * equals stake, netProfit 0) and carry no skill signal, so they are ignored here —
 * only `won`/`lost` bets count. Ranked by netProfit desc; ties break by betsWon desc,
 * then totalStaked desc (more volume at the same profit), then bettorId for a
 * stable order.
 */
export class LeaderboardCalculator {
  static calculate(bets: Bet[], limit = 10): LeaderboardEntryDTO[] {
    const byBettor = new Map<string, LeaderboardEntryDTO>()

    for (const bet of bets) {
      if (bet.status !== 'won' && bet.status !== 'lost') continue

      const entry = byBettor.get(bet.bettorId) ?? {
        bettorId: bet.bettorId,
        betsSettled: 0,
        betsWon: 0,
        totalStaked: 0,
        totalPayout: 0,
        netProfit: 0,
      }
      entry.betsSettled += 1
      if (bet.status === 'won') entry.betsWon += 1
      entry.totalStaked += bet.stake.cents
      entry.totalPayout += bet.payout.cents
      entry.netProfit += bet.payout.cents - bet.stake.cents
      byBettor.set(bet.bettorId, entry)
    }

    return [...byBettor.values()]
      .sort(
        (a, b) =>
          b.netProfit - a.netProfit ||
          b.betsWon - a.betsWon ||
          b.totalStaked - a.totalStaked ||
          a.bettorId.localeCompare(b.bettorId),
      )
      .slice(0, limit)
  }
}
