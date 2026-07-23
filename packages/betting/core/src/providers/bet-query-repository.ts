import { Bet, BetDTO } from '../model'

/** Bet READ port (query side of CQRS). */
export interface BetQueryRepository {
  listByMatchQuery(matchId: string): Promise<BetDTO[]>
  listByBettorQuery(bettorId: string): Promise<BetDTO[]>
  // Open bets as entities, for the live-odds read model (OddsCalculator).
  findOpenBetsByMatch(matchId: string): Promise<Bet[]>
}
