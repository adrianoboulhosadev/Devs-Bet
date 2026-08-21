export interface PollCloseCommand {
  pollId: string
  // Absolute time betting should shut automatically (the poll's closesAt).
  at: Date
}

/**
 * Queue port that schedules the automatic betting close. When a poll is created
 * (or its deadline moved), the use case asks this port to close it at `at`; the
 * backend implements it with a BullMQ DELAYED job and the worker consumes it
 * (running AutoClosePoll). The queue/job name literals must match between
 * producer and consumer.
 *
 * Deliberately a port of its own rather than a reuse of match's MatchLockQueue:
 * the two schedule different jobs on different queues, and sharing the interface
 * would only couple two contexts that never talk.
 */
export interface PollCloseQueue {
  scheduleClose(command: PollCloseCommand): Promise<void>
}
