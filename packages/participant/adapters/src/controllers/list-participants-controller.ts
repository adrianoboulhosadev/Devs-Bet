import { ListParticipantsQuery, ParticipantQueryRepository, ParticipantDTO } from '@participant/core'

export default class ListParticipantsController {
  constructor(private readonly participantQueryRepository: ParticipantQueryRepository) {}

  async execute(): Promise<ParticipantDTO[]> {
    return new ListParticipantsQuery(this.participantQueryRepository).execute()
  }
}
