import { UseCase } from 'shared'
import { ProfileStatsDTO } from '../model'
import { LevelCalculator } from '../domain-services'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): one bettor's win/loss tally and XP/level progress. */
export default class GetMyProfileStatsQuery implements UseCase<string, ProfileStatsDTO> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<ProfileStatsDTO> {
    const [simpleBets, combos] = await Promise.all([
      this.betQueryRepository.findSettledBetsByBettor(bettorId),
      this.betQueryRepository.listComboBetsByBettorQuery(bettorId),
    ])
    return LevelCalculator.calculate(simpleBets, combos)
  }
}
