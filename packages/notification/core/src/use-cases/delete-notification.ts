import { UseCase, NotFoundError, Errors } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  notificationId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Removes one notification from the user's own inbox. Someone else's answers
 * exactly like a missing one (same choice as MarkNotificationAsRead): never
 * confirm to a stranger that a given notification exists — and never let them
 * delete it.
 *
 * The inbox is a delivery record, not an audit trail: what actually happened
 * lives in the ledger, the bets and the payments, so the user is free to clear
 * a line here without erasing any history.
 */
export default class DeleteNotification implements UseCase<Input, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute({ notificationId, userId }: Input): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId)
    if (!notification || notification.userId !== userId) {
      NotFoundError.throwError(Errors.NOTIFICATION_NOT_FOUND, notificationId)
    }

    await this.notificationRepository.deleteById(notificationId)
  }
}
