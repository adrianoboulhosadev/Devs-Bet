import { UseCase, NotFoundError, Errors } from 'shared'
import { TournamentRepository } from '../providers'

interface Input {
  tournamentId: string
  matchId: string
  // The winner as it appears on the settled Match (a displayName, the tournament's
  // natural key); the aggregate maps it back to the competing participant.
  winnerDisplayName: string
}

/**
 * Advances the bracket after one of its matches is settled. System path (not
 * admin-gated): it is triggered by the backend right after the admin declares the
 * match result on the dedicated tournament route — the authorization already
 * happened there. Records the winner on the slot and either promotes them to the
 * next round or crowns the champion (Tournament.recordResult).
 */
export default class RecordBracketResult implements UseCase<Input, void> {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute({ tournamentId, matchId, winnerDisplayName }: Input): Promise<void> {
    const tournament = await this.tournamentRepository.findAggregate(tournamentId)
    if (!tournament) NotFoundError.throwError(Errors.TOURNAMENT_NOT_FOUND, tournamentId)

    tournament.recordResult(matchId, winnerDisplayName)
    await this.tournamentRepository.update(tournament)
  }
}
