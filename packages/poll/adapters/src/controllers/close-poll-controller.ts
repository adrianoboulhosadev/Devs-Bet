import { ClosePoll, PollRepository } from '@poll/core'
import { AuthenticatedActor } from 'shared'

export default class ClosePollController {
  constructor(private readonly pollRepository: PollRepository) {}

  async execute(pollId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new ClosePoll(this.pollRepository)
    await useCase.execute({ pollId }, actor)
  }
}
