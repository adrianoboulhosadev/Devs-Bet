import { UseCase, ConflictError, ValidationError, Errors } from 'shared'
import { ComboBet, BetMarketType, STAKE_LIMIT_WINDOW_MS } from '../model'
import { ComboBettingPlacementRepository, StakeLimitRepository } from '../providers'

interface ComboLegInput {
  marketType: BetMarketType
  marketId: string
  selectionId: string
  // The live indicative odd of this selection, resolved by the caller (backend)
  // at placement time — locked into the leg from here on.
  odd: number
  // Resolved from the owning context by the caller, same as PlaceBet.
  marketOpen: boolean
  selectionIds: string[]
}

interface Input {
  bettorId: string
  stake: number // cents
  legs: ComboLegInput[]
  // Resolved from the wallet context by the caller — responsible gambling.
  bettorSelfExcluded: boolean
}

/**
 * Places a combo (parlay/accumulator) ticket: fixed odds, locked at placement —
 * unlike PlaceBet's parimutuel single bet. Every leg must target an open market
 * on a real selection (ComboBet itself guards the minimum leg count and rejects
 * a repeated market). The atomic reservation of the stake happens in the
 * placement repo's adapter, same as a single bet.
 *
 * Responsible gambling: same checks as PlaceBet — active self-exclusion blocks
 * outright; otherwise the ticket's stake counts against the bettor's daily
 * StakeLimit alongside their single bets.
 */
export default class PlaceComboBet implements UseCase<Input, void> {
  constructor(
    private readonly comboPlacementRepository: ComboBettingPlacementRepository,
    private readonly stakeLimitRepository: StakeLimitRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    if (input.bettorSelfExcluded) {
      ConflictError.throwError(Errors.SELF_EXCLUDED, input.bettorId)
    }
    for (const leg of input.legs) {
      if (!leg.marketOpen) ConflictError.throwError(Errors.BETTING_CLOSED, leg.marketId)
      if (!leg.selectionIds.includes(leg.selectionId)) {
        ValidationError.throwError(Errors.NOT_A_PARTICIPANT, leg.selectionId)
      }
    }

    const stakeLimit = await this.stakeLimitRepository.findStakeLimit(input.bettorId)
    if (stakeLimit) {
      const since = new Date(Date.now() - STAKE_LIMIT_WINDOW_MS)
      const usedInWindow = await this.stakeLimitRepository.sumStakedSince(input.bettorId, since)
      stakeLimit.ensureWithinLimit(usedInWindow, input.stake)
    }

    const combo = new ComboBet({
      bettorId: input.bettorId,
      stake: input.stake,
      legs: input.legs.map((leg) => ({
        marketType: leg.marketType,
        marketId: leg.marketId,
        selectionId: leg.selectionId,
        odd: leg.odd,
      })),
    })

    await this.comboPlacementRepository.placeCombo(combo)
  }
}
