import { RecordBracketResult, TournamentRepository } from '@tournament/core'

export default class RecordBracketResultController {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  // System path: the backend has already settled the match (admin) and resolved
  // the winner's displayName from it; here we only advance the bracket.
  async execute(tournamentId: string, matchId: string, winnerDisplayName: string): Promise<void> {
    const useCase = new RecordBracketResult(this.tournamentRepository)
    await useCase.execute({ tournamentId, matchId, winnerDisplayName })
  }
}
