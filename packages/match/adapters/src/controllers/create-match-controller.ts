import { CreateMatch, MatchRepository, MatchLockQueue } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { CreateMatchInput } from '../@types'

export default class CreateMatchController {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {}

  // The actor (id + role) comes from the JWT; the admin role is re-checked inside
  // the use case (AdminUseCase). scheduledAt arrives on the wire as an ISO string
  // and becomes a Date here — the Match entity validates it (required, not past).
  async execute(input: CreateMatchInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CreateMatch(this.matchRepository, this.lockQueue)
    await useCase.execute(
      {
        title: input.title,
        gameType: input.gameType,
        scheduledAt: new Date(input.scheduledAt),
        rakeBasisPoints: input.rakeBasisPoints,
        participants: input.participants,
      },
      actor,
    )
  }
}
