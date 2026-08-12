import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { NotificationDispatcher } from './notification.dispatcher'

/**
 * The WRITE side of notifications, with no controller and no dependency on
 * AuthModule — that is the whole point of splitting it out of NotificationModule.
 * Auth, Wallet and User all raise notifications, and AuthModule is also what
 * provides the AuthMiddleware the notification controller needs; keeping the
 * dispatcher here is what stops those imports from becoming a cycle.
 */
@Module({
  imports: [DbModule],
  providers: [PrismaNotificationRepository, NotificationDispatcher],
  exports: [PrismaNotificationRepository, NotificationDispatcher],
})
export class NotificationStoreModule {}
