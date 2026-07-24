import { ListMyComboBetsQuery, BetQueryRepository, ComboBetDTO } from '@betting/core'

export default class ListMyComboBetsController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(bettorId: string): Promise<ComboBetDTO[]> {
    return new ListMyComboBetsQuery(this.betQueryRepository).execute(bettorId)
  }
}
