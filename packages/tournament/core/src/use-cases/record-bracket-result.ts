import { UseCase, NotFoundError, Errors } from 'shared'
import { TournamentRepository } from '../providers'

interface Input {
  tournamentId: string
  matchId: string
  // The winner as it appears on the settled Match (a displayName, the tournament's
  // natural key); the aggregate maps it back to the competing participant.
  winnerDisplayName: string
  // Units won by each side of the settled Match — only meaningful when `matchId`
  // is a group-stage matchup (feeds the group's standings tiebreak); ignored for
  // a knockout confrontation. Defaults to 0/0 so existing callers are unaffected.
  unitsWonByWinner?: number
  unitsWonByLoser?: number
}

/**
 * Advances the tournament after one of its confrontations is settled — a group
 * matchup or a knockout confrontation, whichever `matchId` belongs to
 * (Tournament.recordConfrontationResult resolves which). System path (not
 * admin-gated): it is triggered by the backend right after the admin declares
 * the match result on the dedicated tournament route — the authorization
 * already happened there.
 */
export default class RecordBracketResult implements UseCase<Input, void> {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute({
    tournamentId,
    matchId,
    winnerDisplayName,
    unitsWonByWinner,
    unitsWonByLoser,
  }: Input): Promise<void> {
    const tournament = await this.tournamentRepository.findAggregate(tournamentId)
    if (!tournament) NotFoundError.throwError(Errors.TOURNAMENT_NOT_FOUND, tournamentId)

    tournament.recordConfrontationResult(
      matchId,
      winnerDisplayName,
      unitsWonByWinner ?? 0,
      unitsWonByLoser ?? 0,
    )
    await this.tournamentRepository.update(tournament)
  }
}
