import { Notification } from '../model'

/**
 * Notification WRITE port (command side).
 *
 * `createMany` must be IDEMPOTENT: a notification is uniquely identified by
 * (userId, type, referenceId), and re-delivering the same event (a settlement
 * job that got retried, an admin double-clicking confirm) has to be a no-op
 * instead of a duplicate line in the inbox. The adapter enforces it with a
 * unique index + skipDuplicates; the domain only promises the triple.
 */
export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>
  createMany(notifications: Notification[]): Promise<void>
  update(notification: Notification): Promise<void>
  markAllAsRead(userId: string): Promise<void>
}
