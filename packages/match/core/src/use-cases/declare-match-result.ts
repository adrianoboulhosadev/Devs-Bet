import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
  // null declares a draw (nobody won) — only matches allow this; a tournament
  // bracket confrontation always requires a real winner to advance.
  winnerParticipantId: string | null
}

/**
 * Admin declares the result (locked → settled), winner or draw. Records it on
 * the match; the payout of the bets is a separate, cross-context step
 * orchestrated by the backend (it enqueues the betting settlement — a draw
 * enqueues with a null winningSelectionId, which refunds everyone). Admin-only
 * (AdminUseCase).
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
