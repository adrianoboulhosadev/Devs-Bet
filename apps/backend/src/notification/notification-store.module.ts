import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { NotificationDispatcher } from './notification.dispatcher'
import { NotificationAudience } from './notification-audience'
import { DomainEventListener } from './domain-event-listener'
import { LiveUpdates } from './live-updates'

/**
 * The WRITE side of notifications, with no controller and no dependency on
 * AuthModule — that is the whole point of splitting it out of NotificationModule.
 * Auth, Wallet and User all raise domain events that land here, and AuthModule
 * is also what provides the AuthMiddleware the notification controller needs;
 * keeping this side free of auth is what stops those imports from becoming a
 * cycle (see NotificationAudience for the same reasoning applied to reading
 * `users`).
 */
@Module({
  imports: [DbModule],
  providers: [
    PrismaNotificationRepository,
    NotificationAudience,
    LiveUpdates,
    NotificationDispatcher,
    DomainEventListener,
  ],
  exports: [PrismaNotificationRepository, DomainEventListener, LiveUpdates],
})
export class NotificationStoreModule {}
