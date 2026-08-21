import { PollDTO } from '../model'

/** Poll READ port (query side of CQRS) — returns DTOs. */
export interface PollQueryRepository {
  findByIdQuery(id: string): Promise<PollDTO | null>
  listQuery(): Promise<PollDTO[]>
}
