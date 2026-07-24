import { CancelTournament, TournamentRepository } from '@tournament/core'
import { AuthenticatedActor } from 'shared'

export default class CancelTournamentController {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute(tournamentId: string, actor: AuthenticatedActor): Promise<void> {
    const useCase = new CancelTournament(this.tournamentRepository)
    await useCase.execute({ tournamentId }, actor)
  }
}
