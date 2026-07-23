import { UseCase } from 'shared'
import { BetDTO } from '../model'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): every bet placed on a match (the match's book). */
export default class ListBetsByMatchQuery implements UseCase<string, BetDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(matchId: string): Promise<BetDTO[]> {
    return this.betQueryRepository.listByMatchQuery(matchId)
  }
}
