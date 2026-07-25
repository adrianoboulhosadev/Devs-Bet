import { UseCase } from 'shared'
import { OddsSnapshotDTO } from '../model'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): the odds-history chart data for a market. */
export default class GetOddsHistoryQuery implements UseCase<string, OddsSnapshotDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<OddsSnapshotDTO[]> {
    return this.betQueryRepository.listOddsHistoryByMarket(marketId)
  }
}
