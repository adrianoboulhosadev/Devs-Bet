import { GetMarketOddsQuery, BetQueryRepository, MarketOddsDTO } from '@betting/core'

export default class GetMarketOddsController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<MarketOddsDTO> {
    return new GetMarketOddsQuery(this.betQueryRepository).execute(marketId)
  }
}
