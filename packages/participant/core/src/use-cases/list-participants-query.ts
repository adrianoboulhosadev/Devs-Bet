import { UseCase } from 'shared'
import { ParticipantDTO } from '../model'
import { ParticipantQueryRepository } from '../providers'

/** Lists the whole catalog. Open to any authenticated user (needed to populate
 * the picker when creating a match/tournament). */
export default class ListParticipantsQuery implements UseCase<void, ParticipantDTO[]> {
  constructor(private readonly participantQueryRepository: ParticipantQueryRepository) {}

  async execute(): Promise<ParticipantDTO[]> {
    return this.participantQueryRepository.listQuery()
  }
}
