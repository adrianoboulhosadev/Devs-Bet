import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
}

/**
 * Admin cancels a match (any state but settled → cancelled). The refund of all
 * bets is orchestrated downstream by the backend. Admin-only (AdminUseCase).
 */
export default class CancelMatch extends AdminUseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {
    super()
  }

  protected async executeAsAdmin({ matchId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, matchId)

    match.cancel()
    await this.matchRepository.update(match)
  }
}
