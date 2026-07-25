import { AdminUseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { ParticipantRepository } from '../providers'

interface Input {
  participantId: string
  // Resolved by the backend (cross-context: checks match/tournament usage) —
  // participant never imports those contexts.
  isInUse: boolean
}

/**
 * Admin removes a catalog participant. Refused if it has ever been picked into
 * a match/tournament (their own MatchParticipant/TournamentParticipant rows
 * already snapshot the name, so this is not about protecting history — it is
 * a product decision to keep the catalog meaning "still assignable"). Admin-only.
 */
export default class DeleteParticipant extends AdminUseCase<Input, void> {
  constructor(private readonly participantRepository: ParticipantRepository) {
    super()
  }

  protected async executeAsAdmin({ participantId, isInUse }: Input): Promise<void> {
    const participant = await this.participantRepository.findById(participantId)
    if (!participant) NotFoundError.throwError(Errors.PARTICIPANT_NOT_FOUND, participantId)

    if (isInUse) ConflictError.throwError(Errors.PARTICIPANT_IN_USE, participantId)

    await this.participantRepository.delete(participantId)
  }
}
