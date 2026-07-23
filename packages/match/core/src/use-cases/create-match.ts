import { AdminUseCase, AuthenticatedActor } from 'shared'
import { Match } from '../model'
import { MatchRepository } from '../providers'

interface ParticipantInput {
  displayName: string
  userId?: string | null
}

interface Input {
  title: string
  gameType?: string | null
  rakeBasisPoints?: number
  participants: ParticipantInput[]
}

/**
 * Admin creates a match. All the rules (title required, at least two
 * participants, valid rake) live in the Match/MatchParticipant constructors —
 * the use case only builds the aggregate (creator = the admin actor) and
 * persists it. Admin-only (AdminUseCase).
 */
export default class CreateMatch extends AdminUseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {
    super()
  }

  protected async executeAsAdmin(input: Input, actor: AuthenticatedActor): Promise<void> {
    const match = new Match({
      creatorId: actor.id,
      title: input.title,
      gameType: input.gameType,
      rakeBasisPoints: input.rakeBasisPoints,
      participants: input.participants,
    })

    await this.matchRepository.create(match)
  }
}
