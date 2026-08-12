import { Notification, NotificationInput } from '@notification/adapters'
import { Bet, ComboBet, BetMarketType } from '@betting/adapters'
import { Prisma } from 'database'

/** The row shape the notifications table takes. Mapped here (and not through the
 * backend's repository) because driven adapters belong to each app — the same
 * reason inMoneyTransaction is duplicated in this worker. */
function toRow(notification: Notification) {
  return {
    id: notification.id.value,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    referenceId: notification.referenceId,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  }
}

/**
 * Writes the inbox lines for a settlement INSIDE its transaction.
 *
 * Deliberate, and the opposite of the backend's dispatcher (which fires after
 * its transaction commits): here the notifications are derived from the very
 * rows being written, so riding along means they can neither be lost after a
 * successful settlement nor be delivered for one that rolled back. It is the
 * same call the OddsSnapshot already makes inside PlaceBet — a read-side side
 * effect written by the adapter, with no use case of its own.
 *
 * `skipDuplicates` + the (userId, type, referenceId) unique index is what makes
 * a re-run of the settlement job leave the inbox untouched.
 */
export async function writeNotifications(
  tx: Prisma.TransactionClient,
  items: NotificationInput[],
): Promise<void> {
  if (items.length === 0) return
  await tx.notification.createMany({
    data: items.map((item) => toRow(Notification.for(item))),
    skipDuplicates: true,
  })
}

/** Betting names the outright market `tournament_outright`; the notification
 * only cares which page to link to. */
function marketKind(marketType: BetMarketType): 'match' | 'tournament' {
  return marketType === 'match' ? 'match' : 'tournament'
}

/**
 * The market's name, so the notification can say WHAT was settled instead of
 * just "your bet". One query per settlement (not per bet): every bet in the
 * batch belongs to the same market. Falls back to a generic label if the row
 * vanished — a missing title must never break the payout.
 */
export async function resolveMarketTitle(
  tx: Prisma.TransactionClient,
  marketType: BetMarketType,
  marketId: string,
): Promise<string> {
  if (marketType === 'match') {
    const match = await tx.match.findUnique({ where: { id: marketId }, select: { title: true } })
    return match?.title ?? 'a partida'
  }
  const tournament = await tx.tournament.findUnique({
    where: { id: marketId },
    select: { title: true },
  })
  return tournament?.title ?? 'o torneio'
}

/** One inbox line per settled bet, worded by its outcome. */
export function betNotification(bet: Bet, marketTitle: string): NotificationInput | null {
  const shared = {
    userId: bet.bettorId,
    marketKind: marketKind(bet.marketType),
    marketId: bet.marketId,
    marketTitle,
    referenceId: bet.id.value,
  }

  if (bet.status === 'won') return { ...shared, type: 'bet_won', payout: bet.payout.cents }
  if (bet.status === 'lost') return { ...shared, type: 'bet_lost', stake: bet.stake.cents }
  if (bet.status === 'refunded') return { ...shared, type: 'bet_refunded', stake: bet.stake.cents }
  return null // still open: nothing happened to tell about
}

/** One inbox line per combo ticket that REACHED a final status this round — a
 * leg resolving while the ticket stays open is not news yet. */
export function comboNotification(combo: ComboBet): NotificationInput | null {
  const shared = {
    userId: combo.bettorId,
    legs: combo.legs.length,
    referenceId: combo.id.value,
  }

  if (combo.status === 'won') return { ...shared, type: 'combo_won', payout: combo.payout.cents }
  if (combo.status === 'lost') return { ...shared, type: 'combo_lost', stake: combo.stake.cents }
  if (combo.status === 'refunded') {
    return { ...shared, type: 'combo_refunded', stake: combo.stake.cents }
  }
  return null
}
