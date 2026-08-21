import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { PollRepository } from '../providers'

interface Input {
  pollId: string
}

/**
 * Admin calls a poll off (any state but settled → cancelled) — the exit for a
 * question the world never answered, or one asked wrong. The refund of every
 * bet is orchestrated downstream by the backend. Admin-only (AdminUseCase).
 */
export default class CancelPoll extends AdminUseCase<Input, void> {
  constructor(private readonly pollRepository: PollRepository) {
    super()
  }

  protected async executeAsAdmin({ pollId }: Input): Promise<void> {
    const poll = await this.pollRepository.findById(pollId)
    if (!poll) NotFoundError.throwError(Errors.POLL_NOT_FOUND, pollId)

    poll.cancel()
    await this.pollRepository.update(poll)
  }
}
