import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PollCloseQueue, PollCloseCommand } from '@poll/adapters'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const POLL_CLOSE_QUEUE = 'poll-close'
export const POLL_CLOSE_JOB = 'close'

/**
 * BullMQ producer for the automatic betting close. Schedules a DELAYED job to
 * fire at the poll's closesAt (delay = at − now, floored at 0 for a past or
 * imminent time); the worker consumes it and runs AutoClosePoll. The queue/job
 * name literals must match between producer and consumer.
 */
@Injectable()
export class BullMqPollCloseQueue implements PollCloseQueue, OnModuleDestroy {
  private readonly connection: IORedis
  private readonly queue: Queue

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.queue = new Queue(POLL_CLOSE_QUEUE, { connection: this.connection })
  }

  async scheduleClose(command: PollCloseCommand): Promise<void> {
    const delay = Math.max(0, command.at.getTime() - Date.now())
    await this.queue.add(
      POLL_CLOSE_JOB,
      { pollId: command.pollId },
      // A stable jobId de-duplicates re-scheduling for the same poll. BullMQ
      // rejects a custom id containing ':' (its own key separator), hence '-'.
      { delay, jobId: `close-${command.pollId}` },
    )
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
    await this.connection.quit()
  }
}
