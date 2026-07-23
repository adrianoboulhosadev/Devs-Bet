import { UseCase, NotFoundError, Errors } from 'shared'
import { MatchDTO } from '../model'
import { MatchQueryRepository } from '../providers'

/** Read side (CQRS): a single match with its participants. */
export default class GetMatchQuery implements UseCase<string, MatchDTO> {
  constructor(private readonly matchQueryRepository: MatchQueryRepository) {}

  async execute(id: string): Promise<MatchDTO> {
    const match = await this.matchQueryRepository.findByIdQuery(id)
    if (!match) NotFoundError.throwError(Errors.MATCH_NOT_FOUND, id)
    return match
  }
}
