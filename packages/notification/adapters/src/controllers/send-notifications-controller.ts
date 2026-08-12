import { SendNotifications, NotificationRepository, NotificationInput } from '@notification/core'

export default class SendNotificationsController {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(items: NotificationInput[]): Promise<void> {
    await new SendNotifications(this.notificationRepository).execute({ items })
  }
}
