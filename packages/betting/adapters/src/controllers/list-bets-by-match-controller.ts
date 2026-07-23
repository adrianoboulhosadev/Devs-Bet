import { ListBetsByMatchQuery, BetQueryRepository, BetDTO } from '@betting/core'

export default class ListBetsByMatchController {
  constructor(private readonly betQueryRepository: BetQueryRepository) {}

  async execute(matchId: string): Promise<BetDTO[]> {
    return new ListBetsByMatchQuery(this.betQueryRepository).execute(matchId)
  }
}
