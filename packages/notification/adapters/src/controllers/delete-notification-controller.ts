import { DeleteNotification, NotificationRepository } from '@notification/core'

export default class DeleteNotificationController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    await new DeleteNotification(this.notificationRepository).execute({ notificationId, userId })
  }
}
