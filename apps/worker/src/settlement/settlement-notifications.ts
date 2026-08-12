import { DomainEvent } from 'shared'
import { Notification, NotificationInput } from '@notification/adapters'
import {
  BetMarketType,
  BetWon,
  BetLost,
  BetRefunded,
  ComboWon,
  ComboLost,
  ComboRefunded,
} from '@betting/adapters'
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

/**
 * Turns the DOMAIN EVENTS a settled bet/ticket recorded into inbox lines.
 *
 * Reading the events instead of re-inspecting `bet.status` is what keeps this in
 * step with the domain: the entity already decided WHAT happened (including the
 * subtle case of a combo whose leg resolved while the ticket stayed open — it
 * records nothing then, so nothing shows up here either). The app layer only
 * decides what to SAY about it, enriching with the market title it resolved.
 *
 * Unknown events are ignored: a context may record events nobody notifies about
 * (BetRefunded from a bettor's own CancelBet never reaches this path at all).
 */
export function notificationsFor(
  events: DomainEvent[],
  marketTitle: string,
): NotificationInput[] {
  const items: NotificationInput[] = []

  for (const event of events) {
    if (event instanceof BetWon) {
      items.push({
        userId: event.bettorId,
        type: 'bet_won',
        marketKind: marketKind(event.marketType),
        marketId: event.marketId,
        marketTitle,
        payout: event.payout,
        referenceId: event.betId,
      })
    } else if (event instanceof BetLost) {
      items.push({
        userId: event.bettorId,
        type: 'bet_lost',
        marketKind: marketKind(event.marketType),
        marketId: event.marketId,
        marketTitle,
        stake: event.stake,
        referenceId: event.betId,
      })
    } else if (event instanceof BetRefunded) {
      items.push({
        userId: event.bettorId,
        type: 'bet_refunded',
        marketKind: marketKind(event.marketType),
        marketId: event.marketId,
        marketTitle,
        stake: event.stake,
        referenceId: event.betId,
      })
    } else if (event instanceof ComboWon) {
      items.push({
        userId: event.bettorId,
        type: 'combo_won',
        legs: event.legs,
        payout: event.payout,
        referenceId: event.comboBetId,
      })
    } else if (event instanceof ComboLost) {
      items.push({
        userId: event.bettorId,
        type: 'combo_lost',
        legs: event.legs,
        stake: event.stake,
        referenceId: event.comboBetId,
      })
    } else if (event instanceof ComboRefunded) {
      items.push({
        userId: event.bettorId,
        type: 'combo_refunded',
        legs: event.legs,
        stake: event.stake,
        referenceId: event.comboBetId,
      })
    }
  }

  return items
}
