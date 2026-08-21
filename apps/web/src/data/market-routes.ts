import type { BetMarketType } from '@betting/adapters'

/**
 * Where each betting market lives: the segment under `/bet` on the API, the
 * front route that shows it, and the React Query key its live odds are cached
 * under.
 *
 * A map instead of the ternary chains that used to be copied across the slip,
 * the bets list and the combo list — adding a market is one line here, and the
 * screens stop drifting apart from one another.
 */
export const MARKET_ROUTES: Record<
  BetMarketType,
  { api: string; page: string; oddsKey: string; oddsHistoryKey: string; noun: string }
> = {
  match: {
    api: 'match',
    page: 'matches',
    oddsKey: 'odds',
    oddsHistoryKey: 'odds-history',
    noun: 'partida',
  },
  tournament_outright: {
    api: 'tournament',
    page: 'tournaments',
    oddsKey: 'outright-odds',
    oddsHistoryKey: 'outright-odds-history',
    noun: 'torneio',
  },
  poll: {
    api: 'poll',
    page: 'polls',
    oddsKey: 'poll-odds',
    oddsHistoryKey: 'poll-odds-history',
    noun: 'enquete',
  },
}

/** The page that shows a market — used by every list that links back to it. */
export function marketHref(marketType: BetMarketType, marketId: string): string {
  return `/${MARKET_ROUTES[marketType].page}/${marketId}`
}
