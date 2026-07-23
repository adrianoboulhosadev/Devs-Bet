import { UseCase } from 'shared'
import { BetDTO } from '../model'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated user's bets. */
export default class ListMyBetsQuery implements UseCase<string, BetDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<BetDTO[]> {
    return this.betQueryRepository.listByBettorQuery(bettorId)
  }
}
