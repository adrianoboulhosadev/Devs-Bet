import { ListPollsQuery, PollQueryRepository, PollDTO } from '@poll/core'

export default class ListPollsController {
  constructor(private readonly pollQueryRepository: PollQueryRepository) {}

  async execute(): Promise<PollDTO[]> {
    const useCase = new ListPollsQuery(this.pollQueryRepository)
    return useCase.execute()
  }
}
