import { LockMatch, MatchRepository } from '@match/core'
import { AuthenticatedActor } from 'shared'

export default class LockMatchController {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new LockMatch(this.matchRepository)
    await useCase.execute({ matchId }, actor)
  }
}
