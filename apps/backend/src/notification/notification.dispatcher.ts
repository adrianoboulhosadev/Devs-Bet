import { Injectable, Logger } from '@nestjs/common'
import { NotificationFacade, NotificationInput } from '@notification/adapters'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { LiveUpdates } from './live-updates'

/**
 * How the rest of the backend raises notifications.
 *
 * Two deliberate choices:
 *
 * 1. It is called AFTER the business operation committed, never inside its
 *    transaction — a wallet credit that worked must not be rolled back because
 *    an inbox line failed to write. (The worker's settlement is the exception,
 *    and for the opposite reason: there the notification IS derived from the
 *    same rows being written, so it rides along in the same transaction.)
 * 2. It swallows its own failures (logging them): the caller's HTTP response
 *    describes the money move, and a notification that never arrived is not a
 *    reason to tell the admin their confirmation failed.
 *
 * `notifyAdmins` takes the recipient ids instead of resolving them, so this
 * stays free of the auth module (which itself raises notifications on signup —
 * injecting the user repository here would make the two modules circular).
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name)

  constructor(
    private readonly notificationRepository: PrismaNotificationRepository,
    private readonly liveUpdates: LiveUpdates,
  ) {}

  async notify(items: NotificationInput[]): Promise<void> {
    if (items.length === 0) return
    try {
      await new NotificationFacade(this.notificationRepository).send(items)
      // Only after the write succeeded: a ping for a notification that failed
      // to save would make the client re-read and find nothing.
      await this.liveUpdates.notifyUsers(items.map((item) => item.userId))
    } catch (error) {
      this.logger.error(`failed to deliver ${items.length} notification(s)`, error as Error)
    }
  }

  async notifyAdmins(
    adminIds: string[],
    build: (adminId: string) => NotificationInput,
  ): Promise<void> {
    await this.notify(adminIds.map(build))
  }
}
