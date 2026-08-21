import { UseCase, NotFoundError, Errors } from 'shared'
import { PollDTO } from '../model'
import { PollQueryRepository } from '../providers'

/** Read side (CQRS): a single poll with its options. */
export default class GetPollQuery implements UseCase<string, PollDTO> {
  constructor(private readonly pollQueryRepository: PollQueryRepository) {}

  async execute(id: string): Promise<PollDTO> {
    const poll = await this.pollQueryRepository.findByIdQuery(id)
    if (!poll) NotFoundError.throwError(Errors.POLL_NOT_FOUND, id)
    return poll
  }
}
