import { UseCase, NotFoundError, Errors } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  notificationId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Marks one notification as read. Someone else's notification answers exactly
 * like a missing one (same choice as CancelBet): never confirm to a stranger
 * that a given notification exists.
 */
export default class MarkNotificationAsRead implements UseCase<Input, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute({ notificationId, userId }: Input): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId)
    if (!notification || notification.userId !== userId) {
      NotFoundError.throwError(Errors.NOTIFICATION_NOT_FOUND, notificationId)
    }

    if (notification.isRead) return // idempotent: keeps the original timestamp

    notification.markAsRead()
    await this.notificationRepository.update(notification)
  }
}
