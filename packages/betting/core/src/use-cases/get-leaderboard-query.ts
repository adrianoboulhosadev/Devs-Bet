import { UseCase } from 'shared'
import { LeaderboardEntryDTO } from '../model'
import { LeaderboardCalculator } from '../domain-services'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): top bettors by net profit across every settled market. */
export default class GetLeaderboardQuery implements UseCase<number, LeaderboardEntryDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(limit: number): Promise<LeaderboardEntryDTO[]> {
    const bets = await this.betQueryRepository.findSettledBets()
    return LeaderboardCalculator.calculate(bets, limit)
  }
}
