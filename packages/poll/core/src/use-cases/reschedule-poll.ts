import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { PollRepository, PollCloseQueue } from '../providers'

interface Input {
  pollId: string
  closesAt: Date
}

/**
 * Admin moves a poll's betting deadline while it is still open — the only edit a
 * poll accepts (Poll.reschedule holds the invariants). The automatic close is
 * re-scheduled through the queue port, exactly as UpdateMatch re-schedules the
 * auto-lock. Admin-only (AdminUseCase).
 */
export default class ReschedulePoll extends AdminUseCase<Input, void> {
  constructor(
    private readonly pollRepository: PollRepository,
    private readonly closeQueue?: PollCloseQueue,
  ) {
    super()
  }

  protected async executeAsAdmin({ pollId, closesAt }: Input): Promise<void> {
    const poll = await this.pollRepository.findById(pollId)
    if (!poll) NotFoundError.throwError(Errors.POLL_NOT_FOUND, pollId)

    poll.reschedule(closesAt)
    await this.pollRepository.update(poll)
    await this.closeQueue?.scheduleClose({ pollId: poll.id.value, at: poll.closesAt })
  }
}
