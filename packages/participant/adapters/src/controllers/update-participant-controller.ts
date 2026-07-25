import { UpdateParticipant, ParticipantRepository } from '@participant/core'
import { AuthenticatedActor } from 'shared'
import { UpdateParticipantInput } from '../@types'

export default class UpdateParticipantController {
  constructor(private readonly participantRepository: ParticipantRepository) {}

  async execute(
    participantId: string,
    input: UpdateParticipantInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    const useCase = new UpdateParticipant(this.participantRepository)
    await useCase.execute(
      { participantId, name: input.name, nickname: input.nickname, imageUrl: input.imageUrl },
      actor,
    )
  }
}
