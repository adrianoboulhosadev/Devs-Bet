import { Participant } from '../model'

/**
 * Participant WRITE port (command side). Dedup uses `existsByName` (boolean, no
 * fetch-and-map) — the catalog enforces a globally unique name, same spirit as
 * Category's `existsByNameAndParent`.
 */
export interface ParticipantRepository {
  findById(id: string): Promise<Participant | null>
  create(participant: Participant): Promise<void>
  update(participant: Participant): Promise<void>
  delete(id: string): Promise<void>
  existsByName(name: string): Promise<boolean>
}
