import { UseCase, NotFoundError, Errors } from 'shared'
import { TournamentDTO } from '../model'
import { TournamentQueryRepository } from '../providers'

/** Read side (CQRS): a single tournament with its participants and full bracket. */
export default class GetTournamentQuery implements UseCase<string, TournamentDTO> {
  constructor(private readonly tournamentQueryRepository: TournamentQueryRepository) {}

  async execute(id: string): Promise<TournamentDTO> {
    const tournament = await this.tournamentQueryRepository.findByIdQuery(id)
    if (!tournament) NotFoundError.throwError(Errors.TOURNAMENT_NOT_FOUND, id)
    return tournament
  }
}
