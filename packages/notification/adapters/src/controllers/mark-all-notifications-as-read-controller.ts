import { MarkAllNotificationsAsRead, NotificationRepository } from '@notification/core'

export default class MarkAllNotificationsAsReadController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await new MarkAllNotificationsAsRead(this.notificationRepository).execute({ userId })
  }
}
