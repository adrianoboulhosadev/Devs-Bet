import { DeleteParticipant, ParticipantRepository } from '@participant/core'
import { AuthenticatedActor } from 'shared'

export default class DeleteParticipantController {
  constructor(private readonly participantRepository: ParticipantRepository) {}

  // isInUse is resolved cross-context by the backend (checks match/tournament
  // usage) — participant never imports those contexts.
  async execute(participantId: string, isInUse: boolean, actor: AuthenticatedActor): Promise<void> {
    const useCase = new DeleteParticipant(this.participantRepository)
    await useCase.execute({ participantId, isInUse }, actor)
  }
}
