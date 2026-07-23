import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { MatchController } from './match.controller'
import { PrismaMatchRepository } from './prisma-match-repository'
import { BullMqMatchLockQueue } from './bullmq-match-lock-queue'
import { QueueModule } from '../betting/queue.module'

@Module({
  imports: [DbModule, AuthModule, QueueModule],
  controllers: [MatchController],
  providers: [PrismaMatchRepository, BullMqMatchLockQueue],
})
export class MatchModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(MatchController)
  }
}
