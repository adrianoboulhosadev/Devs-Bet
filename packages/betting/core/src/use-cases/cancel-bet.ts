import { UseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { BetCancellationRepository } from '../providers'

interface Input {
  betId: string
  // Resolved from the JWT at the HTTP boundary — never taken from the body (anti-IDOR).
  bettorId: string
  // Whether the bet's market still accepts bets, resolved by the caller (backend)
  // — betting does not import match/tournament. Once the market locks, the bet is
  // committed: it has to be graded like everyone else's.
  marketOpen: boolean
}

/**
 * The bettor cancels their own bet and gets the stake back. Only allowed while
 * the market is still open — the moment betting locks (a match kicking off, a
 * tournament starting) the wager stands, otherwise anyone could pull out of a
 * losing position after seeing how things are going.
 *
 * The refund is `Bet.refund()`, the same transition a cancelled market produces,
 * so a cancelled bet carries no win/loss signal (the leaderboard already ignores
 * refunded bets).
 */
export default class CancelBet implements UseCase<Input, void> {
  constructor(private readonly cancellationRepository: BetCancellationRepository) {}

  async execute({ betId, bettorId, marketOpen }: Input): Promise<void> {
    const bet = await this.cancellationRepository.findBetById(betId)

    // Someone else's bet answers exactly like a missing one — never confirm that
    // a bet exists to a user who does not own it.
    if (!bet || bet.bettorId !== bettorId) {
      NotFoundError.throwError(Errors.BET_NOT_FOUND, betId)
    }
    if (bet.status !== 'open') ConflictError.throwError(Errors.BET_NOT_OPEN, bet.status)
    if (!marketOpen) ConflictError.throwError(Errors.BETTING_CLOSED, bet.marketId)

    bet.refund()

    await this.cancellationRepository.cancelBet(bet)
  }
}
