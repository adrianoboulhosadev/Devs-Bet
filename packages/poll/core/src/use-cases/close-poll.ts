import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { PollRepository } from '../providers'

interface Input {
  pollId: string
}

/**
 * Admin shuts betting early (open → closed) — used when the answer shows up
 * before the deadline, which is the normal case for a poll about the world.
 * Admin-only (AdminUseCase).
 */
export default class ClosePoll extends AdminUseCase<Input, void> {
  constructor(private readonly pollRepository: PollRepository) {
    super()
  }

  protected async executeAsAdmin({ pollId }: Input): Promise<void> {
    const poll = await this.pollRepository.findById(pollId)
    if (!poll) NotFoundError.throwError(Errors.POLL_NOT_FOUND, pollId)

    poll.closeBetting()
    await this.pollRepository.update(poll)
  }
}
