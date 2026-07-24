import { Module } from '@nestjs/common'
import { BullMqSettlementQueue } from './bullmq-settlement-queue'

// Owns the settlement queue producer so the match module (settle/cancel), the
// tournament module (bracket results + outright settlement) and any other module
// share a single Redis connection.
@Module({
  providers: [BullMqSettlementQueue],
  exports: [BullMqSettlementQueue],
})
export class QueueModule {}
