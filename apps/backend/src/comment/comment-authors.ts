import { Injectable } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'

/** How one author shows up on screen. Never an e-mail: the comment thread is
 * visible to every bettor, and the only screen that shows a third party's
 * e-mail is the admin's front door (see CLAUDE.md, seção auth). */
export interface CommentAuthorView {
  label: string
  avatarUrl: string | null
}

/**
 * Puts a face and a name on a comment's `authorId`.
 *
 * Reads `users` directly instead of borrowing auth's repository — the same
 * reasoning as NotificationAudience: a driven adapter belongs to the side that
 * needs it, and the comment context never learns that identities exist. It only
 * labels; nothing here decides anything.
 */
@Injectable()
export class CommentAuthors {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves a whole thread's authors in ONE query — a comment list would
   * otherwise fire a lookup per line. */
  async viewsFor(authorIds: string[]): Promise<Map<string, CommentAuthorView>> {
    const unique = [...new Set(authorIds)]
    if (unique.length === 0) return new Map()

    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, nickname: true, avatarUrl: true },
    })

    const views = new Map<string, CommentAuthorView>()
    for (const row of rows) {
      views.set(row.id, { label: labelFor(row.id, row.nickname), avatarUrl: row.avatarUrl })
    }
    // A deleted account still has its comments on screen; they keep a stable,
    // anonymous label instead of disappearing mid-conversation.
    for (const authorId of unique) {
      if (!views.has(authorId)) views.set(authorId, { label: labelFor(authorId, null), avatarUrl: null })
    }
    return views
  }
}

/** Nickname when there is one, else a TRUNCATED id — the same choice the
 * payments panel and the pending-payment alerts already make. */
function labelFor(userId: string, nickname: string | null): string {
  return nickname?.trim() || userId.slice(0, 8)
}
