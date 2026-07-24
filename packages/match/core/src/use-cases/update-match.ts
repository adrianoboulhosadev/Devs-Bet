import { AdminUseCase, NotFoundError, ValidationError, Errors } from 'shared'
import { MatchRepository, MatchLockQueue } from '../providers'

interface Input {
  matchId: string
  title?: string
  categoryId?: string
  // Resolved by the caller (backend) when categoryId is being changed; must be a leaf.
  categoryIsLeaf?: boolean
  scheduledAt?: Date
}

/**
 * Admin edits a match's mutable details (title, categoryId, scheduledAt) while it
 * is still `open`. The invariants (only-open, non-empty title, future date) live
 * in Match.edit; the category-leaf rule is checked here with data resolved by the
 * app. If the schedule changed, the automatic betting lock is re-scheduled via the
 * queue port. Admin-only (AdminUseCase).
 */
export default class UpdateMatch extends AdminUseCase<Input, void> {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {
    super()
  }

  protected async executeAsAdmin(input: Input): Promise<void> {
    const match = await this.matchRepository.findById(input.matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, input.matchId)

    if (input.categoryId !== undefined && !input.categoryIsLeaf) {
      ValidationError.throwError(Errors.CATEGORY_NOT_LEAF, input.categoryId)
    }

    match.edit({ title: input.title, categoryId: input.categoryId, scheduledAt: input.scheduledAt })
    await this.matchRepository.update(match)

    // Re-schedule the auto-lock when the time changed.
    if (input.scheduledAt !== undefined) {
      await this.lockQueue?.scheduleLock({ matchId: match.id.value, at: match.scheduledAt })
    }
  }
}
