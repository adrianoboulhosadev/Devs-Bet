import { CancelPoll, PollRepository } from '@poll/core'
import { AuthenticatedActor } from 'shared'

export default class CancelPollController {
  constructor(private readonly pollRepository: PollRepository) {}

  async execute(pollId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CancelPoll(this.pollRepository)
    await useCase.execute({ pollId }, actor)
  }
}
