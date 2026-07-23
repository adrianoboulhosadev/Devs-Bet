import { MatchDTO } from '../model'

/** Match READ port (query side of CQRS) — returns DTOs. */
export interface MatchQueryRepository {
  findByIdQuery(id: string): Promise<MatchDTO | null>
  listQuery(): Promise<MatchDTO[]>
}
