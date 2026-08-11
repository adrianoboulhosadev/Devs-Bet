import { GetMyProfileStatsQuery, BetQueryRepository, ProfileStatsDTO } from '@betting/core'

export default class GetMyProfileStatsController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<ProfileStatsDTO> {
    return new GetMyProfileStatsQuery(this.betQueryRepository).execute(bettorId)
  }
}
