import { ListMyBetsQuery, BetQueryRepository, BetDTO } from '@betting/core'

export default class ListMyBetsController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<BetDTO[]> {
    return new ListMyBetsQuery(this.betQueryRepository).execute(bettorId)
  }
}
