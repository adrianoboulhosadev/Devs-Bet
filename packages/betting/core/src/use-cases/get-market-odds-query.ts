import { UseCase } from 'shared'
import { MarketOddsDTO } from '../model'
import { OddsCalculator } from '../domain-services'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): live/indicative odds for a market, from its open bets. */
export default class GetMarketOddsQuery implements UseCase<string, MarketOddsDTO> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<MarketOddsDTO> {
    const bets = await this.betQueryRepository.findOpenBetsByMarket(marketId)
    return OddsCalculator.calculate(marketId, bets)
  }
}
