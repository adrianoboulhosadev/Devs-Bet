import { Injectable } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'

/**
 * How a bettor is NAMED on the screens that list bets (a match's book, the
 * leaderboard). Reads `users` directly instead of importing auth's repository —
 * the same call NotificationAudience already makes, and for the same reason: a
 * driven adapter belongs to the side that needs it, and betting must not depend
 * on the auth context.
 *
 * The label is the nickname when there is one, else a TRUNCATED id. Never the
 * e-mail: these lists are visible to every authenticated user, so the only
 * screen that may show someone else's e-mail stays the admin control room.
 */
@Injectable()
export class BettorDirectory {
  constructor(private readonly prisma: PrismaService) {}

  /** One query for the whole list — never one lookup per bet. */
  async labelsFor(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)]
    if (unique.length === 0) return new Map()

    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, nickname: true },
    })
    const found = new Map(rows.map((row) => [row.id, row.nickname?.trim() || null]))
    // Falls back for a bettor whose account no longer exists, so a deleted
    // user never blanks out the row.
    return new Map(unique.map((id) => [id, found.get(id) || id.slice(0, 8)]))
  }
}
