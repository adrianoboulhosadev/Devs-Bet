import type { LeaderboardEntryDTO } from '@betting/adapters'

/**
 * A ranked row. `bettorLabel` is composed by the BACKEND
 * (`GET /bet/leaderboard`) by crossing betting with auth — the bettor's
 * nickname, or a truncated id when they have none. Mirrored by hand for the
 * same reason as the match book's BookEntry.
 */
export type LeaderboardRow = LeaderboardEntryDTO & { bettorLabel: string }
