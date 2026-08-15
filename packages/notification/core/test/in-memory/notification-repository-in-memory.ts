import {
  NotificationRepository,
  NotificationQueryRepository,
  Notification,
  NotificationDTO,
  NotificationType,
} from '../../src'

interface NotificationRow {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  referenceId: string | null
  readAt: Date | null
  createdAt: Date
}

export default class NotificationRepositoryInMemory
  implements NotificationRepository, NotificationQueryRepository
{
  readonly notifications: NotificationRow[] = []

  async findById(id: string): Promise<Notification | null> {
    const row = this.notifications.find((notification) => notification.id === id)
    return row ? new Notification({ ...row }) : null
  }

  // Mirrors the adapter's `skipDuplicates` on (userId, type, referenceId) — the
  // fake has to reproduce the idempotency, otherwise a test could pass here and
  // duplicate in production.
  async createMany(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      const duplicate = this.notifications.some(
        (row) =>
          row.userId === notification.userId &&
          row.type === notification.type &&
          row.referenceId === notification.referenceId,
      )
      if (duplicate) continue

      this.notifications.push({
        id: notification.id.value,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        referenceId: notification.referenceId,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })
    }
  }

  async update(notification: Notification): Promise<void> {
    const row = this.notifications.find((current) => current.id === notification.id.value)
    if (!row) return
    row.readAt = notification.readAt
  }

  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date()
    for (const row of this.notifications) {
      if (row.userId === userId && !row.readAt) row.readAt = now
    }
  }

  async deleteById(id: string): Promise<void> {
    const index = this.notifications.findIndex((row) => row.id === id)
    if (index >= 0) this.notifications.splice(index, 1)
  }

  async deleteAllByUser(userId: string): Promise<void> {
    const kept = this.notifications.filter((row) => row.userId !== userId)
    this.notifications.splice(0, this.notifications.length, ...kept)
  }

  async listByUserQuery(userId: string, limit: number): Promise<NotificationDTO[]> {
    return this.notifications
      .filter((row) => row.userId === userId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .slice(0, limit)
      .map((row) => this.toDTO(row))
  }

  async countUnreadQuery(userId: string): Promise<number> {
    return this.notifications.filter((row) => row.userId === userId && !row.readAt).length
  }

  private toDTO(row: NotificationRow): NotificationDTO {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt,
    }
  }
}
