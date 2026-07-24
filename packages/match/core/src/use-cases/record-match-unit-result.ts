import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { MatchRepository } from '../providers'

interface Input {
  matchId: string
  // null declares a draw for this unit — only legal on a bestOf-1 match that
  // allowsDraw; a tournament confrontation always requires a real winner.
  winnerParticipantId: string | null
}

/**
 * Admin records the winner of the match's next unit (map/leg/round/fight —
 * sport-agnostic). The unit number is always "whatever comes next" — the use
 * case reads it off the match itself, callers never track it. Once the bestOf
 * series is decided (majority reached, or a draw on a bestOf-1 match), the
 * match auto-settles (Match.recordUnitResult) and the payout of the bets is a
 * separate, cross-context step orchestrated by the backend (it enqueues the
 * betting settlement only once the match is actually settled). Admin-only
 * (AdminUseCase).
 */
export default class RecordMatchUnitResult extends AdminUseCase<Input, void> {
  constructor(private readonly matchRepository: MatchRepository) {
    super()
  }

  protected async executeAsAdmin({ matchId, winnerParticipantId }: Input): Promise<void> {
    const match = await this.matchRepository.findById(matchId)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, matchId)

    match.recordUnitResult(match.units.length + 1, winnerParticipantId)
    await this.matchRepository.update(match)
  }
}
