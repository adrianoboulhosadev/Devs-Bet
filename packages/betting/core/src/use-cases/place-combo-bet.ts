import { UseCase, ConflictError, ValidationError, Errors } from 'shared'
import { ComboBet, BetMarketType } from '../model'
import { ComboBettingPlacementRepository } from '../providers'

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
}

/**
 * Places a combo (parlay/accumulator) ticket: fixed odds, locked at placement —
 * unlike PlaceBet's parimutuel single bet. Every leg must target an open market
 * on a real selection (ComboBet itself guards the minimum leg count and rejects
 * a repeated market). The atomic reservation of the stake happens in the
 * placement repo's adapter, same as a single bet.
 */
export default class PlaceComboBet implements UseCase<Input, void> {
  constructor(private readonly comboPlacementRepository: ComboBettingPlacementRepository) {}

  async execute(input: Input): Promise<void> {
    for (const leg of input.legs) {
      if (!leg.marketOpen) ConflictError.throwError(Errors.BETTING_CLOSED, leg.marketId)
      if (!leg.selectionIds.includes(leg.selectionId)) {
        ValidationError.throwError(Errors.NOT_A_PARTICIPANT, leg.selectionId)
      }
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
