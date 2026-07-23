import { GetMatchOddsQuery, BetQueryRepository, MatchOddsDTO } from '@betting/core'

export default class GetMatchOddsController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(matchId: string): Promise<MatchOddsDTO> {
    return new GetMatchOddsQuery(this.betQueryRepository).execute(matchId)
  }
}
