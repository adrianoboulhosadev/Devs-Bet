import { CancelMatch, MatchRepository } from '@match/core'
import { AuthenticatedActor } from 'shared'

export default class CancelMatchController {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CancelMatch(this.matchRepository)
    await useCase.execute({ matchId }, actor)
  }
}
