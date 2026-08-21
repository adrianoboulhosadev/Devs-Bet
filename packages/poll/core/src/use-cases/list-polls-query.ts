import { UseCase } from 'shared'
import { PollDTO } from '../model'
import { PollQueryRepository } from '../providers'

/** Read side (CQRS): the poll lobby (all polls, newest first). */
export default class ListPollsQuery implements UseCase<void, PollDTO[]> {
  constructor(private readonly pollQueryRepository: PollQueryRepository) {}

  async execute(): Promise<PollDTO[]> {
    return this.pollQueryRepository.listQuery()
  }
}
