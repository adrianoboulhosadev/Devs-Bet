import { UseCase } from 'shared'
import { Match } from '../model'
import { MatchRepository } from '../providers'

interface ParticipantInput {
  displayName: string
  userId?: string | null
}

interface Input {
  creatorId: string
  title: string
  gameType?: string | null
  rakeBasisPoints?: number
  participants: ParticipantInput[]
}

/**
 * Creates a match. All the rules (title required, at least two participants,
 * valid rake) live in the Match/MatchParticipant constructors — the use case
 * only builds the aggregate and persists it.
 */
export default class CreateMatch implements UseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(input: Input): Promise<void> {
    const match = new Match({
      creatorId: input.creatorId,
      title: input.title,
      gameType: input.gameType,
      rakeBasisPoints: input.rakeBasisPoints,
      participants: input.participants,
    })

    await this.matchRepository.create(match)
  }
}
