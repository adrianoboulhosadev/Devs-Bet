import { UseCase } from 'shared'
import { PollRepository } from '../providers'

interface Input {
  pollId: string
}

/**
 * System-triggered close (the worker runs it when the deadline arrives) — NOT
 * admin-gated, since no user initiates it. Idempotent by design: if the poll is
 * gone or no longer `open` (already closed by an admin, settled or cancelled),
 * it is a no-op. The `open → closed` invariant still lives in Poll.closeBetting.
 */
export default class AutoClosePoll implements UseCase<Input, void> {
  constructor(private readonly pollRepository: PollRepository) {}

  async execute({ pollId }: Input): Promise<void> {
    const poll = await this.pollRepository.findById(pollId)
    if (!poll || !poll.isOpen) return

    poll.closeBetting()
    await this.pollRepository.update(poll)
  }
}
