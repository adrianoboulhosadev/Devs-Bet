import { GetPollQuery, PollQueryRepository, PollDTO } from '@poll/core'

export default class GetPollController {
  constructor(private readonly pollQueryRepository: PollQueryRepository) {}

  async execute(id: string): Promise<PollDTO> {
    const useCase = new GetPollQuery(this.pollQueryRepository)
    return useCase.execute(id)
  }
}
