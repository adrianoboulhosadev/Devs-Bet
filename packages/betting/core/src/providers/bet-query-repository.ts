import { Bet, BetDTO } from '../model'

/** Bet READ port (query side of CQRS). */
export interface BetQueryRepository {
  listByMarketQuery(marketId: string): Promise<BetDTO[]>
  listByBettorQuery(bettorId: string): Promise<BetDTO[]>
  // Open bets as entities, for the live-odds read model (OddsCalculator).
  findOpenBetsByMarket(marketId: string): Promise<Bet[]>
}
