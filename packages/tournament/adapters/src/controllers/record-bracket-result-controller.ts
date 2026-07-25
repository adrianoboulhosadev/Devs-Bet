import { RecordBracketResult, TournamentRepository } from '@tournament/core'

export default class RecordBracketResultController {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  // System path: the backend has already settled the match (admin) and resolved
  // the winner's displayName from it; here we only advance the tournament.
  // unitsWon* (resolved by the backend from the settled Match's units) only
  // matter when matchId is a group-stage matchup — ignored for a knockout one.
  async execute(
    tournamentId: string,
    matchId: string,
    winnerDisplayName: string,
    unitsWonByWinner?: number,
    unitsWonByLoser?: number,
  ): Promise<void> {
    const useCase = new RecordBracketResult(this.tournamentRepository)
    await useCase.execute({
      tournamentId,
      matchId,
      winnerDisplayName,
      unitsWonByWinner,
      unitsWonByLoser,
    })
  }
}
