import { UpdateMatch, MatchRepository, MatchLockQueue } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { UpdateMatchInput } from '../@types'

export default class UpdateMatchController {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {}

  // The actor (id + role) comes from the JWT; the admin role is re-checked inside
  // the use case (AdminUseCase). scheduledAt arrives as an ISO string.
  // categoryIsLeaf is resolved by the backend when categoryId is being changed.
  async execute(
    matchId: string,
    input: UpdateMatchInput,
    actor: AuthenticatedActor,
    categoryIsLeaf?: boolean,
  ): Promise<void> {
    const useCase = new UpdateMatch(this.matchRepository, this.lockQueue)
    await useCase.execute(
      {
        matchId,
        title: input.title,
        categoryId: input.categoryId,
        categoryIsLeaf,
        scheduledAt: input.scheduledAt !== undefined ? new Date(input.scheduledAt) : undefined,
      },
      actor,
    )
  }
}
