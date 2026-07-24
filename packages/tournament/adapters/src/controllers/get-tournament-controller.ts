import { GetTournamentQuery, TournamentQueryRepository, TournamentDTO } from '@tournament/core'

export default class GetTournamentController {
  constructor(private readonly tournamentQueryRepository: TournamentQueryRepository) {}

  async execute(id: string): Promise<TournamentDTO> {
    const useCase = new GetTournamentQuery(this.tournamentQueryRepository)
    return useCase.execute(id)
  }
}
