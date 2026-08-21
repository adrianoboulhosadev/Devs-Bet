import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { PollController } from './poll.controller'
import { PrismaPollRepository } from './prisma-poll-repository'
import { BullMqPollCloseQueue } from './bullmq-poll-close-queue'
import { QueueModule } from '../betting/queue.module'
import { CategoryModule } from '../category/category.module'

@Module({
  imports: [DbModule, AuthModule, QueueModule, CategoryModule],
  controllers: [PollController],
  providers: [PrismaPollRepository, BullMqPollCloseQueue],
  // Exported so the betting module can resolve a poll market (is it open, which
  // selections are valid) when a bet is placed on it.
  exports: [PrismaPollRepository],
})
export class PollModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(PollController)
  }
}
