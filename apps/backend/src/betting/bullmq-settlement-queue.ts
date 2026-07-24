import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { SettlementQueue, SettlementJob } from '@betting/adapters'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const SETTLEMENT_QUEUE = 'settlement'
export const SETTLEMENT_JOB = 'settle'

/**
 * BullMQ producer for the settlement queue. The worker consumes the same queue.
 * Handles any market (a match's winner or a tournament's champion) — the job
 * carries the marketId + winning selection. The queue/job name literals must
 * match between producer and consumer.
 */
@Injectable()
export class BullMqSettlementQueue implements SettlementQueue, OnModuleDestroy {
  private readonly connection: IORedis
  private readonly queue: Queue

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
    this.queue = new Queue(SETTLEMENT_QUEUE, { connection: this.connection })
  }

  async enqueue(job: SettlementJob): Promise<void> {
    await this.queue.add(SETTLEMENT_JOB, job)
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close()
    await this.connection.quit()
  }
}
