import { RecordMatchUnitResult, MatchRepository } from '@match/core'
import { AuthenticatedActor } from 'shared'
import { RecordUnitResultInput } from '../@types'

export default class RecordMatchUnitResultController {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, input: RecordUnitResultInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new RecordMatchUnitResult(this.matchRepository)
    await useCase.execute({ matchId, winnerParticipantId: input.winnerParticipantId }, actor)
  }
}
