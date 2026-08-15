import type { BetDTO } from '@betting/adapters'

/**
 * A row of the match's book. `bettorLabel` is composed by the BACKEND
 * (`GET /bet/match/:id`) by crossing betting with auth — the bettor's nickname,
 * or a truncated id when they have none. It belongs to no `@ctx/adapters`
 * because no single context owns the shape, so the type is mirrored by hand
 * here, the same way the profile route's DTO is.
 */
export type BookEntry = BetDTO & { bettorLabel: string }
