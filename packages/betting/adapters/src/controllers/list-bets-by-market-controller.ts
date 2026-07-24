import { ListBetsByMarketQuery, BetQueryRepository, BetDTO } from '@betting/core'

export default class ListBetsByMarketController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<BetDTO[]> {
    return new ListBetsByMarketQuery(this.betQueryRepository).execute(marketId)
  }
}
