import { GetMatchQuery, MatchQueryRepository, MatchDTO } from '@match/core'

export default class GetMatchController {
  constructor(private readonly matchQueryRepository: MatchQueryRepository) {}

  async execute(id: string): Promise<MatchDTO> {
    const useCase = new GetMatchQuery(this.matchQueryRepository)
    return useCase.execute(id)
  }
}
