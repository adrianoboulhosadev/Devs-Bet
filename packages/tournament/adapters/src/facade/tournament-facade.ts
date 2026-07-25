import { TournamentRepository, TournamentQueryRepository, TournamentDTO } from '@tournament/core'
import { AuthenticatedActor } from 'shared'
import {
  CreateTournamentController,
  RecordBracketResultController,
  CancelTournamentController,
  GetTournamentController,
  ListTournamentsController,
} from '../controllers'
import { CreateTournamentInput, TournamentParticipantSnapshot } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case. Creating
 * the round-0 matches (and the next-round matches as the bracket advances) is
 * cross-context orchestration that lives in the backend, not here.
 */
export default class TournamentFacade {
  constructor(
    private readonly tournamentRepository?: TournamentRepository,
    private readonly tournamentQueryRepository?: TournamentQueryRepository,
  ) {}

  async createTournament(
    input: CreateTournamentInput,
    actor: AuthenticatedActor,
    categoryIsLeaf: boolean,
    participants: TournamentParticipantSnapshot[],
    tournamentId?: string,
  ): Promise<void> {
    await new CreateTournamentController(this.tournamentRepository!).execute(
      input,
      actor,
      categoryIsLeaf,
      participants,
      tournamentId,
    )
  }

  async cancelTournament(tournamentId: string, actor: AuthenticatedActor): Promise<void> {
    await new CancelTournamentController(this.tournamentRepository!).execute(tournamentId, actor)
  }

  /** Advances the tournament after a confrontation (group or knockout) is
   * settled (system path). unitsWon* only matter for a group matchup. */
  async recordResult(
    tournamentId: string,
    matchId: string,
    winnerDisplayName: string,
    unitsWonByWinner?: number,
    unitsWonByLoser?: number,
  ): Promise<void> {
    await new RecordBracketResultController(this.tournamentRepository!).execute(
      tournamentId,
      matchId,
      winnerDisplayName,
      unitsWonByWinner,
      unitsWonByLoser,
    )
  }

  async getTournament(id: string): Promise<TournamentDTO> {
    return new GetTournamentController(this.tournamentQueryRepository!).execute(id)
  }

  async listTournaments(): Promise<TournamentDTO[]> {
    return new ListTournamentsController(this.tournamentQueryRepository!).execute()
  }
}
