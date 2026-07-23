import { ListMatchesQuery, MatchQueryRepository, MatchDTO } from '@match/core'

export default class ListMatchesController {
  constructor(private readonly matchQueryRepository: MatchQueryRepository) {}

  async execute(): Promise<MatchDTO[]> {
    const useCase = new ListMatchesQuery(this.matchQueryRepository)
    return useCase.execute()
  }
}
