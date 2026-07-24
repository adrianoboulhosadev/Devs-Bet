import { UseCase } from 'shared'
import { ComboBetDTO } from '../model'
import { BetQueryRepository } from '../providers'

/** Read side (CQRS): the authenticated user's combo (parlay) tickets. */
export default class ListMyComboBetsQuery implements UseCase<string, ComboBetDTO[]> {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<ComboBetDTO[]> {
    return this.betQueryRepository.listComboBetsByBettorQuery(bettorId)
  }
}
