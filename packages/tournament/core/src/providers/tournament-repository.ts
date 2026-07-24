import { Tournament } from '../model'

/**
 * Tournament WRITE port (command side). The aggregate (tournament + participants
 * + bracket slots) is persisted together; `update` saves the mutable state
 * (status, champion, and each slot's players/matchId). The adapter wraps the
 * multi-row writes in a transaction — the core stays unaware of the DB.
 */
export interface TournamentRepository {
  findAggregate(id: string): Promise<Tournament | null>
  create(tournament: Tournament): Promise<void>
  update(tournament: Tournament): Promise<void>
}
