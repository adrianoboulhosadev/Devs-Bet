import { CreatePoll, PollRepository, PollCloseQueue } from '@poll/core'
import { AuthenticatedActor } from 'shared'
import { CreatePollInput } from '../@types'

export default class CreatePollController {
  constructor(
    private readonly pollRepository: PollRepository,
    private readonly closeQueue?: PollCloseQueue,
  ) {}

  // The actor (id + role) comes from the JWT; the admin role is re-checked inside
  // the use case (AdminUseCase). closesAt arrives on the wire as an ISO string and
  // becomes a Date here. categoryIsLeaf is resolved from the category context by
  // the backend and passed in — poll never imports category.
  async execute(
    input: CreatePollInput,
    actor: AuthenticatedActor,
    categoryIsLeaf: boolean,
  ): Promise<void> {
    const useCase = new CreatePoll(this.pollRepository, this.closeQueue)
    await useCase.execute(
      {
        question: input.question,
        resolutionCriteria: input.resolutionCriteria,
        categoryId: input.categoryId,
        categoryIsLeaf,
        imageUrl: input.imageUrl,
        closesAt: new Date(input.closesAt),
        rakeBasisPoints: input.rakeBasisPoints,
        options: input.options,
      },
      actor,
    )
  }
}
