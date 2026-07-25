import { PlaceComboBet, ComboBettingPlacementRepository, StakeLimitRepository } from '@betting/core'
import { PlaceComboBetLegInput } from '../@types'

export default class PlaceComboBetController {
  constructor(
    private readonly comboPlacementRepository: ComboBettingPlacementRepository,
    private readonly stakeLimitRepository: StakeLimitRepository,
  ) {}

  // bettorId from the JWT; each leg's marketOpen/selectionIds/odd already
  // resolved by the backend (betting does not import match/tournament);
  // bettorSelfExcluded resolved from the wallet context, same reason.
  async execute(
    stake: number,
    legs: PlaceComboBetLegInput[],
    bettorId: string,
    bettorSelfExcluded: boolean,
  ): Promise<void> {
    const useCase = new PlaceComboBet(this.comboPlacementRepository, this.stakeLimitRepository)
    await useCase.execute({ bettorId, stake, legs, bettorSelfExcluded })
  }
}
