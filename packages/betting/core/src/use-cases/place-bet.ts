import { UseCase, ConflictError, ValidationError, Errors } from 'shared'
import { Bet, BetMarketType } from '../model'
import { BettingPlacementRepository } from '../providers'

interface Input {
  marketType: BetMarketType
  marketId: string
  bettorId: string
  selectionId: string
  stake: number // cents
  // Resolved from the owning context by the caller (backend) — kept as plain data
  // so betting does not import the match/tournament contexts. `marketOpen` says
  // whether the market currently accepts bets (match open / outright before the
  // tournament starts); `selectionIds` are its valid selections.
  marketOpen: boolean
  selectionIds: string[]
}

/**
 * Places a bet on a selection of a market (a match participant or a tournament's
 * champion). Betting is only allowed while the market is open and on a real
 * selection; the stake must be positive (Bet guards it). The atomic reservation of
 * the stake (wallet.hold) happens in the placement repo's adapter, which also
 * raises INSUFFICIENT_BALANCE.
 */
export default class PlaceBet implements UseCase<Input, void> {
  constructor(private readonly placementRepository: BettingPlacementRepository) {}

  async execute(input: Input): Promise<void> {
    if (!input.marketOpen) {
      ConflictError.throwError(Errors.BETTING_CLOSED, input.marketId)
    }
    if (!input.selectionIds.includes(input.selectionId)) {
      ValidationError.throwError(Errors.NOT_A_PARTICIPANT, input.selectionId)
    }

    const bet = new Bet({
      marketType: input.marketType,
      marketId: input.marketId,
      bettorId: input.bettorId,
      selectionId: input.selectionId,
      stake: input.stake,
    })

    await this.placementRepository.placeBet(bet)
  }
}
