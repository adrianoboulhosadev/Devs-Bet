import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
  winnerParticipantId: string
}

/**
 * Admin declares the winner (locked → settled). Records the result on the match;
 * the payout of the bets is a separate, cross-context step orchestrated by the
 * backend (it enqueues the betting settlement). Admin-only (AdminUseCase).
 */
export default class DeclareMatchResult extends AdminUseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {
    super()
  }

  protected async executeAsAdmin({ matchId, winnerParticipantId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, matchId)

    match.settle(winnerParticipantId)
    await this.matchRepository.update(match)
  }
}
