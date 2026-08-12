import { UseCase } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Clears the badge in one go. Done as a single repository operation instead of
 * loading every entity: there is no per-notification invariant to enforce, and
 * an inbox can be long.
 */
export default class MarkAllNotificationsAsRead implements UseCase<Input, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute({ userId }: Input): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId)
  }
}
