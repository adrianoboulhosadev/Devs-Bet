import { PlaceBet, BettingPlacementRepository } from '@betting/core'
import { PlaceBetInput } from '../@types'

export default class PlaceBetController {
  constructor(private readonly placementRepository: BettingPlacementRepository) {}

  // bettorId from the JWT; marketOpen + selectionIds resolved from the owning
  // context (match/tournament) by the backend and passed in (betting does not
  // import those contexts).
  async execute(
    input: PlaceBetInput,
    bettorId: string,
    marketOpen: boolean,
    selectionIds: string[],
  ): Promise<void> {
    const useCase = new PlaceBet(this.placementRepository)
    await useCase.execute({
      marketType: input.marketType,
      marketId: input.marketId,
      selectionId: input.selectionId,
      stake: input.stake,
      bettorId,
      marketOpen,
      selectionIds,
    })
  }
}
