import { GetLeaderboardQuery, BetQueryRepository, LeaderboardEntryDTO } from '@betting/core'

export default class GetLeaderboardController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(limit: number): Promise<LeaderboardEntryDTO[]> {
    return new GetLeaderboardQuery(this.betQueryRepository).execute(limit)
  }
}
