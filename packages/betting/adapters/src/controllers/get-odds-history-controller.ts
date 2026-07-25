import { GetOddsHistoryQuery, BetQueryRepository, OddsSnapshotDTO } from '@betting/core'

export default class GetOddsHistoryController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(marketId: string): Promise<OddsSnapshotDTO[]> {
    return new GetOddsHistoryQuery(this.betQueryRepository).execute(marketId)
  }
}
