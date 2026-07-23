import { DeclareMatchResult, MatchRepository } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { DeclareResultInput } from '../@types'

export default class DeclareMatchResultController {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, input: DeclareResultInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new DeclareMatchResult(this.matchRepository)
    await useCase.execute({ matchId, winnerParticipantId: input.winnerParticipantId }, actor)
  }
}
