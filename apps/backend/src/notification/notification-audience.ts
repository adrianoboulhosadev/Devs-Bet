import { Injectable } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'

/**
 * The two facts the notification side needs about people: who the admins are,
 * and how to name a user to them.
 *
 * Reads `users` directly instead of borrowing auth's PrismaUserRepository, and
 * that is deliberate: auth RAISES notifications (sign-up, approval), so
 * injecting its repository here would make AuthModule and the notification
 * module circular. Same spirit as the worker keeping its own copy of
 * inMoneyTransaction — a driven adapter belongs to the side that needs it.
 * Read-only, no domain rule: nothing here decides anything, it only labels.
 */
@Injectable()
export class NotificationAudience {
  constructor(private readonly prisma: PrismaService) {}

  /** Only active, approved admins — a revoked one must stop receiving the queue. */
  async adminIds(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: 'admin', active: true, approvalStatus: 'approved' },
      select: { id: true },
    })
    return rows.map((row) => row.id)
  }

  /**
   * How a requester is named to the admin: the nickname when there is one, else
   * a TRUNCATED id — the same choice the payments panel already makes, so a
   * pending-payment alert never carries someone's e-mail around.
   */
  async labelFor(userId: string): Promise<string> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })
    return row?.nickname?.trim() || userId.slice(0, 8)
  }
}
