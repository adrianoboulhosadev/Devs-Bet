import { CreateParticipant, ParticipantRepository } from '@participant/core'
import { AuthenticatedActor } from 'shared'
import { CreateParticipantInput } from '../@types'

export default class CreateParticipantController {
  constructor(private readonly participantRepository: ParticipantRepository) {}

  async execute(input: CreateParticipantInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CreateParticipant(this.participantRepository)
    await useCase.execute(
      { name: input.name, nickname: input.nickname, imageUrl: input.imageUrl },
      actor,
    )
  }
}
