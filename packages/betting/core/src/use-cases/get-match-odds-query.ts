import { UseCase } from 'shared'
import { MatchOddsDTO } from '../model'
import { OddsCalculator } from '../domain-services'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): live/indicative odds for a match, from its open bets. */
export default class GetMatchOddsQuery implements UseCase<string, MatchOddsDTO> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(matchId: string): Promise<MatchOddsDTO> {
    const bets = await this.betQueryRepository.findOpenBetsByMatch(matchId)
    return OddsCalculator.calculate(matchId, bets)
  }
}
