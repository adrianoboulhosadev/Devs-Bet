import { Module } from '@nestjs/common'
import { BullMqMatchSettlementQueue } from './bullmq-match-settlement-queue'

// Owns the settlement queue producer so both the match module (which enqueues on
// settle/cancel) and any other module can share a single Redis connection.
@Module({
  providers: [BullMqMatchSettlementQueue],
  exports: [BullMqMatchSettlementQueue],
})
export class QueueModule {}
