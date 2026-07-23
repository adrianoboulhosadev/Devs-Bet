import { MatchRepository, MatchQueryRepository, MatchDTO } from '@match/core'
import { AuthenticatedActor } from 'shared'
import {
  CreateMatchController,
  LockMatchController,
  DeclareMatchResultController,
  CancelMatchController,
  GetMatchController,
  ListMatchesController,
} from '../controllers'
import { CreateMatchInput, DeclareResultInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class MatchFacade {
  constructor(
    private readonly matchRepository?: MatchRepository,
    private readonly matchQueryRepository?: MatchQueryRepository,
  ) {}

  async createMatch(input: CreateMatchInput, actor: AuthenticatedActor): Promise<void> {
    await new CreateMatchController(this.matchRepository!).execute(input, actor)
  }

  async lockMatch(matchId: string, actor: AuthenticatedActor): Promise<void> {
    await new LockMatchController(this.matchRepository!).execute(matchId, actor)
  }

  async declareResult(
    matchId: string,
    input: DeclareResultInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new DeclareMatchResultController(this.matchRepository!).execute(matchId, input, actor)
  }

  async cancelMatch(matchId: string, actor: AuthenticatedActor): Promise<void> {
    await new CancelMatchController(this.matchRepository!).execute(matchId, actor)
  }

  async getMatch(id: string): Promise<MatchDTO> {
    return new GetMatchController(this.matchQueryRepository!).execute(id)
  }

  async listMatches(): Promise<MatchDTO[]> {
    return new ListMatchesController(this.matchQueryRepository!).execute()
  }
}
