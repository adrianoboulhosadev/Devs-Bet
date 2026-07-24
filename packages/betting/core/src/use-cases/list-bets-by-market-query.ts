import { UseCase } from 'shared'
import { BetDTO } from '../model'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): every bet placed on a market (the market's book). */
export default class ListBetsByMarketQuery implements UseCase<string, BetDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<BetDTO[]> {
    return this.betQueryRepository.listByMarketQuery(marketId)
  }
}
