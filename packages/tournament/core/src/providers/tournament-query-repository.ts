import { TournamentDTO } from '../model'

/** Tournament READ port (query side of CQRS) — returns DTOs with the full bracket. */
export interface TournamentQueryRepository {
  findByIdQuery(id: string): Promise<TournamentDTO | null>
  listQuery(): Promise<TournamentDTO[]>
}
