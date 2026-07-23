import { MatchLockQueue, MatchLockCommand } from '../../src'

/** Records the scheduled locks so the CreateMatch test can assert on them. */
export default class MatchLockQueueInMemory implements MatchLockQueue {
  readonly scheduled: MatchLockCommand[] = []

  async scheduleLock(command: MatchLockCommand): Promise<void> {
    this.scheduled.push(command)
  }
}
