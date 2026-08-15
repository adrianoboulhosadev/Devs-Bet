import { DeleteAllNotifications, NotificationRepository } from '@notification/core'

export default class DeleteAllNotificationsController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await new DeleteAllNotifications(this.notificationRepository).execute({ userId })
  }
}
