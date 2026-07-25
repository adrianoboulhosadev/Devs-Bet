import { ParticipantDTO } from '../model'

/** Participant READ port. `findByIdsQuery` is how the backend resolves the
 * catalog entries a match/tournament creation picked, by id, in one query. */
export interface ParticipantQueryRepository {
  listQuery(): Promise<ParticipantDTO[]>
  findByIdsQuery(ids: string[]): Promise<ParticipantDTO[]>
}
