import { UseCase } from 'shared'
import { TournamentDTO } from '../model'
import { TournamentQueryRepository } from '../providers'

/** Read side (CQRS): the tournament lobby (all tournaments, newest first). */
export default class ListTournamentsQuery implements UseCase<void, TournamentDTO[]> {
  constructor(private readonly tournamentQueryRepository: TournamentQueryRepository) {}

  async execute(): Promise<TournamentDTO[]> {
    return this.tournamentQueryRepository.listQuery()
  }
}
