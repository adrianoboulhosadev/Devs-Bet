import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { MatchSettlementQueue, MatchSettlementJob } from '@betting/adapters'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const MATCH_SETTLEMENT_QUEUE = 'match-settlement'
export const MATCH_SETTLEMENT_JOB = 'settle'

/**
 * BullMQ producer for the settlement queue. The worker consumes the same queue.
 * The queue/job name literals must match between producer and consumer.
 */
@Injectable()
export class BullMqMatchSettlementQueue implements MatchSettlementQueue, OnModuleDestroy {
  private readonly connection: IORedis
  private readonly queue: Queue

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.queue = new Queue(MATCH_SETTLEMENT_QUEUE, { connection: this.connection })
  }

  async enqueue(job: MatchSettlementJob): Promise<void> {
    await this.queue.add(MATCH_SETTLEMENT_JOB, job)
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
    await this.connection.quit()
  }
}
