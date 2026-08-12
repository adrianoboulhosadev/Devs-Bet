import {
  ListMyNotificationsQuery,
  NotificationQueryRepository,
  NotificationFeedDTO,
} from '@notification/core'

export default class ListMyNotificationsController {
  constructor(private readonly notificationQueryRepository: NotificationQueryRepository) {}

  async execute(userId: string, limit?: number): Promise<NotificationFeedDTO> {
    return new ListMyNotificationsQuery(this.notificationQueryRepository).execute({ userId, limit })
  }
}
