import { PollCloseQueue, PollCloseCommand } from '../../src'

/** Records the scheduled closes so the CreatePoll test can assert on them. */
export default class PollCloseQueueInMemory implements PollCloseQueue {
  readonly scheduled: PollCloseCommand[] = []

  async scheduleClose(command: PollCloseCommand): Promise<void> {
    this.scheduled.push(command)
  }
}
