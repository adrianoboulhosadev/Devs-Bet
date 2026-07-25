import { CreateMatch, MatchRepository, MatchLockQueue } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { CreateMatchInput, MatchParticipantSnapshot } from '../@types'

export default class CreateMatchController {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {}

  // The actor (id + role) comes from the JWT; the admin role is re-checked inside
  // the use case (AdminUseCase). scheduledAt arrives on the wire as an ISO string
  // and becomes a Date here. categoryIsLeaf is resolved from the category context
  // by the backend and passed in (match never imports category); `participants`
  // is likewise resolved by the backend from the participant catalog (by the
  // participantIds in `input`) — match never imports @participant/core either.
  async execute(
    input: CreateMatchInput,
    actor: AuthenticatedActor,
    categoryIsLeaf: boolean,
    participants: MatchParticipantSnapshot[],
    matchId?: string,
  ): Promise<void> {
    const useCase = new CreateMatch(this.matchRepository, this.lockQueue)
    await useCase.execute(
      {
        id: matchId,
        title: input.title,
        categoryId: input.categoryId,
        categoryIsLeaf,
        imageUrl: input.imageUrl,
        scheduledAt: new Date(input.scheduledAt),
        rakeBasisPoints: input.rakeBasisPoints,
        bestOf: input.bestOf,
        allowsDraw: input.allowsDraw,
        participants,
      },
      actor,
    )
  }
}
