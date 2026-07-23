import { Match } from '../model'

/**
 * Match WRITE port (command side). Participants are created together with the
 * match (aggregate); `update` persists the lifecycle fields (status, winner,
 * timestamps).
 */
export interface MatchRepository {
  findById(id: string): Promise<Match | null>
  create(match: Match): Promise<void>
  update(match: Match): Promise<void>
}
