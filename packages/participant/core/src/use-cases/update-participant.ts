import { AdminUseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { ParticipantRepository } from '../providers'

interface Input {
  participantId: string
  name?: string
  nickname?: string | null
  imageUrl?: string | null
}

/**
 * Admin edits a catalog participant (name/nickname/imageUrl), freely — a match
 * or tournament that already picked this participant keeps its OWN snapshot
 * (MatchParticipant/TournamentParticipant), so renaming here never rewrites
 * history. The new name must stay globally unique. Admin-only.
 */
export default class UpdateParticipant extends AdminUseCase<Input, void> {
  constructor(private readonly participantRepository: ParticipantRepository) {
    super()
  }

  protected async executeAsAdmin({ participantId, name, nickname, imageUrl }: Input): Promise<void> {
    const participant = await this.participantRepository.findById(participantId)
    if (!participant) NotFoundError.throwError(Errors.PARTICIPANT_NOT_FOUND, participantId)

    const previousName = participant.name
    participant.edit({ name, nickname, imageUrl })

    // Only a name that actually CHANGED can clash. Re-sending the current name
    // (editing just the nickname/image, which is what the form always does)
    // would otherwise match this very row in storage and self-conflict.
    if (participant.name !== previousName) {
      if (await this.participantRepository.existsByName(participant.name)) {
        ConflictError.throwError(Errors.PARTICIPANT_ALREADY_EXISTS, participant.name)
      }
    }

    await this.participantRepository.update(participant)
  }
}
