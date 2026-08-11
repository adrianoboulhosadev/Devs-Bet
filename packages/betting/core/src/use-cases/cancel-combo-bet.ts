import { UseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { BetCancellationRepository } from '../providers'

interface Input {
  comboBetId: string
  // Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR).
  bettorId: string
  // Whether EVERY market the ticket has a leg on still accepts bets, resolved by
  // the caller (backend). One leg's match already under way is enough to commit
  // the whole ticket.
  allMarketsOpen: boolean
}

/**
 * The bettor cancels their own combo ticket and gets the stake back. Stricter
 * than a single bet on purpose: a ticket spans several markets, so it can only be
 * called off while ALL of them are still open — otherwise a bettor could watch
 * the first leg start to go wrong and pull the ticket.
 *
 * `ComboBet.cancel()` refunds the stake and voids the pending legs.
 */
export default class CancelComboBet implements UseCase<Input, void> {
  constructor(private readonly cancellationRepository: BetCancellationRepository) {}

  async execute({ comboBetId, bettorId, allMarketsOpen }: Input): Promise<void> {
    const combo = await this.cancellationRepository.findComboBetById(comboBetId)

    if (!combo || combo.bettorId !== bettorId) {
      NotFoundError.throwError(Errors.BET_NOT_FOUND, comboBetId)
    }
    if (combo.status !== 'open') ConflictError.throwError(Errors.BET_NOT_OPEN, combo.status)
    if (!allMarketsOpen) ConflictError.throwError(Errors.BETTING_CLOSED, comboBetId)

    combo.cancel()

    await this.cancellationRepository.cancelCombo(combo)
  }
}
