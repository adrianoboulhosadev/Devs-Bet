import { ReschedulePoll, PollRepository, PollCloseQueue } from '@poll/core'
import { AuthenticatedActor } from 'shared'
import { ReschedulePollInput } from '../@types'

export default class ReschedulePollController {
  constructor(
    private readonly pollRepository: PollRepository,
    private readonly closeQueue?: PollCloseQueue,
  ) {}

  async execute(
    pollId: string,
    input: ReschedulePollInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    const useCase = new ReschedulePoll(this.pollRepository, this.closeQueue)
    await useCase.execute({ pollId, closesAt: new Date(input.closesAt) }, actor)
  }
}
