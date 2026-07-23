import { PlaceBet, BettingPlacementRepository } from '@betting/core'
import { PlaceBetInput } from '../@types'

export default class PlaceBetController {
  constructor(private readonly placementRepository: BettingPlacementRepository) {}

  // bettorId from the JWT; matchStatus + participantIds resolved from the match
  // context by the backend and passed in (betting does not import match).
  async execute(
    input: PlaceBetInput,
    bettorId: string,
    matchStatus: string,
    participantIds: string[],
  ): Promise<void> {
    const useCase = new PlaceBet(this.placementRepository)
    await useCase.execute({
      matchId: input.matchId,
      participantId: input.participantId,
      stake: input.stake,
      bettorId,
      matchStatus,
      participantIds,
    })
  }
}
