import { PlaceBet, BettingPlacementRepository, StakeLimitRepository } from '@betting/core'
import { PlaceBetInput } from '../@types'

export default class PlaceBetController {
  constructor(
    private readonly placementRepository: BettingPlacementRepository,
    private readonly stakeLimitRepository: StakeLimitRepository,
  ) {}

  // bettorId from the JWT; marketOpen/selectionIds resolved from the owning
  // context (match/tournament) by the backend (betting does not import those
  // contexts); bettorSelfExcluded resolved from the wallet context, same reason.
  async execute(
    input: PlaceBetInput,
    bettorId: string,
    marketOpen: boolean,
    selectionIds: string[],
    bettorSelfExcluded: boolean,
  ): Promise<void> {
    const useCase = new PlaceBet(this.placementRepository, this.stakeLimitRepository)
    await useCase.execute({
      marketType: input.marketType,
      marketId: input.marketId,
      selectionId: input.selectionId,
      stake: input.stake,
      bettorId,
      marketOpen,
      selectionIds,
      bettorSelfExcluded,
    })
  }
}
