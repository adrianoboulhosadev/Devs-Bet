import { AdminUseCase, ConflictError, Errors } from 'shared'
import { Participant } from '../model'
import { ParticipantRepository } from '../providers'

interface Input {
  name: string
  nickname?: string | null
  imageUrl?: string | null
}

/**
 * Admin creates a catalog participant. The name must be globally unique (no
 * per-category scoping — one flat, reusable list). Admin-only (AdminUseCase).
 */
export default class CreateParticipant extends AdminUseCase<Input, void> {
  constructor(private readonly participantRepository: ParticipantRepository) {
    super()
  }

  protected async executeAsAdmin(input: Input): Promise<void> {
    const participant = new Participant({
      name: input.name,
      nickname: input.nickname,
      imageUrl: input.imageUrl,
    })

    if (await this.participantRepository.existsByName(participant.name)) {
      ConflictError.throwError(Errors.PARTICIPANT_ALREADY_EXISTS, participant.name)
    }

    await this.participantRepository.create(participant)
  }
}
