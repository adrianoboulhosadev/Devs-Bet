import { PollRepository, PollQueryRepository, PollCloseQueue, PollDTO } from '@poll/core'
import { AuthenticatedActor } from 'shared'
import {
  CreatePollController,
  ReschedulePollController,
  ClosePollController,
  AutoClosePollController,
  ResolvePollController,
  CancelPollController,
  GetPollController,
  ListPollsController,
} from '../controllers'
import { CreatePollInput, ReschedulePollInput, ResolvePollInput } from '../@types'

/**
 * Single entry point the backend (NestJS) and the worker call. Optional ports in
 * the constructor; each method builds its controller. The admin actor (id +
 * role) comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class PollFacade {
  constructor(
    private readonly pollRepository?: PollRepository,
    private readonly pollQueryRepository?: PollQueryRepository,
    private readonly closeQueue?: PollCloseQueue,
  ) {}

  async createPoll(
    input: CreatePollInput,
    actor: AuthenticatedActor,
    categoryIsLeaf: boolean,
  ): Promise<void> {
    await new CreatePollController(this.pollRepository!, this.closeQueue).execute(
      input,
      actor,
      categoryIsLeaf,
    )
  }

  async reschedulePoll(
    pollId: string,
    input: ReschedulePollInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new ReschedulePollController(this.pollRepository!, this.closeQueue).execute(
      pollId,
      input,
      actor,
    )
  }

  async closePoll(pollId: string, actor: AuthenticatedActor): Promise<void> {
    await new ClosePollController(this.pollRepository!).execute(pollId, actor)
  }

  /** System path (worker): the scheduled auto-close when the deadline arrives. */
  async autoClosePoll(pollId: string): Promise<void> {
    await new AutoClosePollController(this.pollRepository!).execute(pollId)
  }

  async resolvePoll(
    pollId: string,
    input: ResolvePollInput,
    actor: AuthenticatedActor,
  ): Promise<void> {
    await new ResolvePollController(this.pollRepository!).execute(pollId, input, actor)
  }

  async cancelPoll(pollId: string, actor: AuthenticatedActor): Promise<void> {
    await new CancelPollController(this.pollRepository!).execute(pollId, actor)
  }

  async getPoll(id: string): Promise<PollDTO> {
    return new GetPollController(this.pollQueryRepository!).execute(id)
  }

  async listPolls(): Promise<PollDTO[]> {
    return new ListPollsController(this.pollQueryRepository!).execute()
  }
}
