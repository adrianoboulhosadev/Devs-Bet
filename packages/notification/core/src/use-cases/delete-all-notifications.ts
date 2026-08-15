import { UseCase } from 'shared'
import { NotificationRepository } from '../providers'

interface Input {
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  userId: string
}

/**
 * Empties the user's inbox in one go. A single repository operation instead of
 * loading every entity — same reasoning as MarkAllNotificationsAsRead: there is
 * no per-notification invariant to enforce, and an inbox can be long.
 *
 * Scoped to ONE user by the port's signature, so there is no way to phrase a
 * call that wipes somebody else's inbox.
 */
export default class DeleteAllNotifications implements UseCase<Input, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute({ userId }: Input): Promise<void> {
    await this.notificationRepository.deleteAllByUser(userId)
  }
}
