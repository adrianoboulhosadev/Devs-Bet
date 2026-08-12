import { UseCase } from 'shared'
import { Notification, NotificationInput } from '../model'
import { NotificationRepository } from '../providers'

interface Input {
  items: NotificationInput[]
}

/**
 * Delivers a batch of notifications. Called by the app layer right after the
 * event that caused them (an admin confirming a deposit, a settlement finishing),
 * never by the user — there is no HTTP route that creates a notification.
 *
 * A batch because most events fan out: one settled market notifies every bettor,
 * one signup notifies every admin.
 */
export default class SendNotifications implements UseCase<Input, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute({ items }: Input): Promise<void> {
    if (items.length === 0) return
    await this.notificationRepository.createMany(items.map((item) => Notification.for(item)))
  }
}
