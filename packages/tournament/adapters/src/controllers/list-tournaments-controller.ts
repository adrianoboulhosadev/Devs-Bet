import { ListTournamentsQuery, TournamentQueryRepository, TournamentDTO } from '@tournament/core'

export default class ListTournamentsController {
  constructor(private readonly tournamentQueryRepository: TournamentQueryRepository) {}

  async execute(): Promise<TournamentDTO[]> {
    const useCase = new ListTournamentsQuery(this.tournamentQueryRepository)
    return useCase.execute()
  }
}
