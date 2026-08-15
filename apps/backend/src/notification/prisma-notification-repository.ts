import { Injectable } from '@nestjs/common'
import {
  NotificationRepository,
  NotificationQueryRepository,
  Notification,
  NotificationDTO,
  NotificationType,
} from '@notification/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaNotificationRepository
  implements NotificationRepository, NotificationQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } })
    return row
      ? new Notification({
          id: row.id,
          userId: row.userId,
          type: row.type as NotificationType,
          title: row.title,
          body: row.body,
          link: row.link,
          referenceId: row.referenceId,
          readAt: row.readAt,
          createdAt: row.createdAt,
        })
      : null
  }

  // skipDuplicates + the (userId, type, referenceId) unique index is what makes
  // re-delivering an event a no-op — see the port's contract.
  async createMany(notifications: Notification[]): Promise<void> {
    await this.prisma.notification.createMany({
      data: notifications.map((notification) => ({
        id: notification.id.value,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        referenceId: notification.referenceId,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
      skipDuplicates: true,
    })
  }

  async update(notification: Notification): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id.value },
      data: { readAt: notification.readAt },
    })
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } })
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { userId } })
  }

  async listByUserQuery(userId: string, limit: number): Promise<NotificationDTO[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt,
    }))
  }

  async countUnreadQuery(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } })
  }
}
