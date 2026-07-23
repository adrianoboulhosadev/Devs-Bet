import { UseCase } from 'shared'
import { MatchDTO } from '../model'
import { MatchQueryRepository } from '../providers'

/** Read side (CQRS): the match lobby (all matches, newest first). */
export default class ListMatchesQuery implements UseCase<void, MatchDTO[]> {
  constructor(private readonly matchQueryRepository: MatchQueryRepository) {}

  async execute(): Promise<MatchDTO[]> {
    return this.matchQueryRepository.listQuery()
  }
}
