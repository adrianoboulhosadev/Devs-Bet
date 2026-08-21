import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { PollRepository } from '../providers'

interface Input {
  pollId: string
  winningOptionId: string
}

/**
 * Admin declares which answer was right (closed → settled). Every rule — only
 * from `closed`, only one of this poll's own options — lives in Poll.resolve.
 * Paying the bets is a separate, cross-context step orchestrated by the backend
 * (it enqueues the parimutuel settlement once the poll is actually settled),
 * exactly like a match's result. Admin-only (AdminUseCase).
 */
export default class ResolvePoll extends AdminUseCase<Input, void> {
  constructor(private readonly pollRepository: PollRepository) {
    super()
  }

  protected async executeAsAdmin({ pollId, winningOptionId }: Input): Promise<void> {
    const poll = await this.pollRepository.findById(pollId)
    if (!poll) NotFoundError.throwError(Errors.POLL_NOT_FOUND, pollId)

    poll.resolve(winningOptionId)
    await this.pollRepository.update(poll)
  }
}
