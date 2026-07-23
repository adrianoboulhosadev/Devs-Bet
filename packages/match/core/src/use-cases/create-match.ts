import { AdminUseCase, AuthenticatedActor } from 'shared'
import { Match } from '../model'
import { MatchRepository, MatchLockQueue } from '../providers'

interface ParticipantInput {
  displayName: string
  userId?: string | null
}

interface Input {
  title: string
  gameType?: string | null
  scheduledAt: Date
  rakeBasisPoints?: number
  participants: ParticipantInput[]
}

/**
 * Admin creates a match. All the rules (title required, scheduledAt required and
 * not in the past, at least two participants, valid rake) live in the
 * Match/MatchParticipant constructors — the use case only builds the aggregate
 * (creator = the admin actor), persists it and schedules the automatic betting
 * lock for the match's scheduledAt. Admin-only (AdminUseCase).
 */
export default class CreateMatch extends AdminUseCase<Input, void> {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {
    super()
  }

  protected async executeAsAdmin(input: Input, actor: AuthenticatedActor): Promise<void> {
    const match = new Match({
      creatorId: actor.id,
      title: input.title,
      gameType: input.gameType,
      scheduledAt: input.scheduledAt,
      rakeBasisPoints: input.rakeBasisPoints,
      participants: input.participants,
    })

    await this.matchRepository.create(match)
    await this.lockQueue?.scheduleLock({ matchId: match.id.value, at: match.scheduledAt })
  }
}
