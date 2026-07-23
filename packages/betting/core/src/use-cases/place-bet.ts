import { UseCase, ConflictError, ValidationError, Errors } from 'shared'
import { Bet } from '../model'
import { BettingPlacementRepository } from '../providers'

interface Input {
  matchId: string
  bettorId: string
  participantId: string
  stake: number // cents
  // Resolved from the match context by the caller (backend) — kept as plain data
  // so betting does not import the match context.
  matchStatus: string
  participantIds: string[]
}

/**
 * Places a bet on a participant. Betting is only allowed while the match is open
 * and on a real participant; the stake must be positive (Bet guards it). The
 * atomic reservation of the stake (wallet.hold) happens in the placement repo's
 * adapter, which also raises INSUFFICIENT_BALANCE.
 */
export default class PlaceBet implements UseCase<Input, void> {
  constructor(private readonly placementRepository: BettingPlacementRepository) {}

  async execute(input: Input): Promise<void> {
    if (input.matchStatus !== 'open') {
      ConflictError.throwError(Errors.BETTING_CLOSED, input.matchStatus)
    }
    if (!input.participantIds.includes(input.participantId)) {
      ValidationError.throwError(Errors.NOT_A_PARTICIPANT, input.participantId)
    }

    const bet = new Bet({
      matchId: input.matchId,
      bettorId: input.bettorId,
      participantId: input.participantId,
      stake: input.stake,
    })

    await this.placementRepository.placeBet(bet)
  }
}
