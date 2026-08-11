import { CancelBet, CancelComboBet, BetCancellationRepository } from '@betting/core'

/**
 * Cancelling one's own wager. `bettorId` comes from the JWT (anti-IDOR) and
 * whether the market(s) still accept bets is resolved by the backend — betting
 * imports neither match nor tournament.
 */
export default class CancelBetController {
  constructor(private readonly cancellationRepository: BetCancellationRepository) {}

  async cancelBet(betId: string, bettorId: string, marketOpen: boolean): Promise<void> {
    await new CancelBet(this.cancellationRepository).execute({ betId, bettorId, marketOpen })
  }

  async cancelCombo(comboBetId: string, bettorId: string, allMarketsOpen: boolean): Promise<void> {
    await new CancelComboBet(this.cancellationRepository).execute({
      comboBetId,
      bettorId,
      allMarketsOpen,
    })
  }
}
