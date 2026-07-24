import { MatchRepository, MatchQueryRepository, MatchLockQueue, MatchDTO } from '@match/core'
import { AuthenticatedActor } from 'shared'
import {
  CreateMatchController,
  UpdateMatchController,
  LockMatchController,
  AutoLockMatchController,
  DeclareMatchResultController,
  CancelMatchController,
  GetMatchController,
  ListMatchesController,
} from '../controllers'
import { CreateMatchInput, UpdateMatchInput, DeclareResultInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class MatchFacade {
  constructor(
    private readonly matchRepository?: MatchRepository,
    private readonly matchQueryRepository?: MatchQueryRepository,
    private readonly lockQueue?: MatchLockQueue,
  ) {}

  async createMatch(input: CreateMatchInput, actor: AuthenticatedActor): Promise<void> {
    await new CreateMatchController(this.matchRepository!, this.lockQueue).execute(input, actor)
  }

  async updateMatch(
    matchId: string,
    input: UpdateMatchInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new UpdateMatchController(this.matchRepository!, this.lockQueue).execute(matchId, input, actor)
  }

  async lockMatch(matchId: string, actor: AuthenticatedActor): Promise<void> {
    await new LockMatchController(this.matchRepository!).execute(matchId, actor)
  }

  /** System path (worker): the scheduled auto-lock when the match's time arrives. */
  async autoLockMatch(matchId: string): Promise<void> {
    await new AutoLockMatchController(this.matchRepository!).execute(matchId)
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
