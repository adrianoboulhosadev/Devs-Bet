import { PlaceComboBet, ComboBettingPlacementRepository } from '@betting/core'
import { PlaceComboBetLegInput } from '../@types'

export default class PlaceComboBetController {
  constructor(private readonly comboPlacementRepository: ComboBettingPlacementRepository) {}

  // bettorId from the JWT; each leg's marketOpen/selectionIds/odd already
  // resolved by the backend (betting does not import match/tournament).
  async execute(stake: number, legs: PlaceComboBetLegInput[], bettorId: string): Promise<void> {
    const useCase = new PlaceComboBet(this.comboPlacementRepository)
    await useCase.execute({ bettorId, stake, legs })
  }
}
