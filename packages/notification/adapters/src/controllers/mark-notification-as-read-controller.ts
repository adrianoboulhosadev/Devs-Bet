import { MarkNotificationAsRead, NotificationRepository } from '@notification/core'

export default class MarkNotificationAsReadController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    await new MarkNotificationAsRead(this.notificationRepository).execute({
      notificationId,
      userId,
    })
  }
}
