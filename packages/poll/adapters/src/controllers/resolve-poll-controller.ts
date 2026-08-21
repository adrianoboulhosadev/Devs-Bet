import { ResolvePoll, PollRepository } from '@poll/core'
import { AuthenticatedActor } from 'shared'
import { ResolvePollInput } from '../@types'

export default class ResolvePollController {
  constructor(private readonly pollRepository: PollRepository) {}

  async execute(pollId: string, input: ResolvePollInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new ResolvePoll(this.pollRepository)
    await useCase.execute({ pollId, winningOptionId: input.winningOptionId }, actor)
  }
}
