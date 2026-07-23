export interface MatchLockCommand {
  matchId: string
  // Absolute time the betting should auto-lock (the match's scheduledAt).
  at: Date
}

/**
 * Queue port that schedules the automatic betting lock. When a match is created,
 * the use case asks this port to lock it at `at`; the backend implements it with
 * a BullMQ DELAYED job and the worker consumes it (running AutoLockMatch). The
 * queue/job name literals must match between producer and consumer.
 */
export interface MatchLockQueue {
  scheduleLock(command: MatchLockCommand): Promise<void>
}
