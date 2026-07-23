import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { MatchLockQueue, MatchLockCommand } from '@match/adapters'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const MATCH_LOCK_QUEUE = 'match-lock'
export const MATCH_LOCK_JOB = 'lock'

/**
 * BullMQ producer for the automatic betting lock. Schedules a DELAYED job to
 * fire at the match's scheduledAt (delay = at − now, floored at 0 for a past or
 * imminent time); the worker consumes it and runs AutoLockMatch. The queue/job
 * name literals must match between producer and consumer.
 */
@Injectable()
export class BullMqMatchLockQueue implements MatchLockQueue, OnModuleDestroy {
  private readonly connection: IORedis
  private readonly queue: Queue

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.queue = new Queue(MATCH_LOCK_QUEUE, { connection: this.connection })
  }

  async scheduleLock(command: MatchLockCommand): Promise<void> {
    const delay = Math.max(0, command.at.getTime() - Date.now())
    await this.queue.add(
      MATCH_LOCK_JOB,
      { matchId: command.matchId },
      // A stable jobId de-duplicates re-scheduling for the same match.
      { delay, jobId: `lock:${command.matchId}` },
    )
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
    await this.connection.quit()
  }
}
