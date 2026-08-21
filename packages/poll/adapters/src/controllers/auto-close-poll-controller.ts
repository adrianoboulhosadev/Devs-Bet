import { AutoClosePoll, PollRepository } from '@poll/core'

/** System path (worker): runs the non-admin, idempotent scheduled close. */
export default class AutoClosePollController {
  constructor(private readonly pollRepository: PollRepository) {}

  async execute(pollId: string): Promise<void> {
    const useCase = new AutoClosePoll(this.pollRepository)
    await useCase.execute({ pollId })
  }
}
