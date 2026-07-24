import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { TournamentRepository } from '../providers'

interface Input {
  tournamentId: string
}

/**
 * Admin cancels a tournament (any state but finished → cancelled). Refunding the
 * open bets of its matches is a separate, cross-context step the backend can
 * orchestrate; here we only flip the tournament state. Admin-only (AdminUseCase).
 */
export default class CancelTournament extends AdminUseCase<Input, void> {
  constructor(private readonly tournamentRepository: TournamentRepository) {
    super()
  }

  protected async executeAsAdmin({ tournamentId }: Input): Promise<void> {
    const tournament = await this.tournamentRepository.findAggregate(tournamentId)
    if (!tournament) NotFoundError.throwError(Errors.TOURNAMENT_NOT_FOUND, tournamentId)

    tournament.cancel()
    await this.tournamentRepository.update(tournament)
  }
}
