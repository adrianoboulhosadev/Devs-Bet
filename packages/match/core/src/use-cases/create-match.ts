import { AdminUseCase, AuthenticatedActor, ValidationError, Errors } from 'shared'
import { Match } from '../model'
import { MatchRepository, MatchLockQueue } from '../providers'

interface ParticipantInput {
  displayName: string
  userId?: string | null
}

interface Input {
  title: string
  categoryId: string
  // Resolved from the category context by the caller (backend) — kept as plain
  // data so match does not import the category context. The category must exist
  // (checked by the caller) and be a leaf (checked here).
  categoryIsLeaf: boolean
  imageUrl?: string | null
  scheduledAt: Date
  rakeBasisPoints?: number
  participants: ParticipantInput[]
}

/**
 * Admin creates a match. All the rules (title required, category leaf, scheduledAt
 * required and not in the past, at least two participants, valid rake) are enforced
 * here / in the Match constructor — the use case builds the aggregate (creator =
 * the admin actor), persists it and schedules the automatic betting lock for the
 * match's scheduledAt. Admin-only (AdminUseCase).
 */
export default class CreateMatch extends AdminUseCase<Input, void> {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {
    super()
  }

  protected async executeAsAdmin(input: Input, actor: AuthenticatedActor): Promise<void> {
    if (!input.categoryIsLeaf) {
      ValidationError.throwError(Errors.CATEGORY_NOT_LEAF, input.categoryId)
    }

    const match = new Match({
      creatorId: actor.id,
      title: input.title,
      categoryId: input.categoryId,
      imageUrl: input.imageUrl,
      scheduledAt: input.scheduledAt,
      rakeBasisPoints: input.rakeBasisPoints,
      participants: input.participants,
    })

    await this.matchRepository.create(match)
    await this.lockQueue?.scheduleLock({ matchId: match.id.value, at: match.scheduledAt })
  }
}
