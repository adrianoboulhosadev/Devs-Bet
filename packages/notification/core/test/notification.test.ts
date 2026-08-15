import { ValidationError, NotFoundError, Errors } from 'shared'
import {
  Notification,
  SendNotifications,
  ListMyNotificationsQuery,
  MarkNotificationAsRead,
  MarkAllNotificationsAsRead,
  DeleteNotification,
  DeleteAllNotifications,
} from '../src'
import { NotificationRepositoryInMemory } from './in-memory'

const bettor = 'user-1'
const other = 'user-2'

test('a notification requires a recipient, a title and a body', () => {
  expect(() => new Notification({ type: 'account_approved', title: 'x', body: 'y' })).toThrow(
    ValidationError,
  )
  expect(() => new Notification({ userId: bettor, type: 'account_approved', body: 'y' })).toThrow(
    ValidationError,
  )
  expect(() => new Notification({ userId: bettor, type: 'account_approved', title: 'x' })).toThrow(
    ValidationError,
  )
})

test('an unknown type is rejected', () => {
  const build = () =>
    // Forced past the type system on purpose: the row could come from an older
    // deploy, so the entity re-checks it on reconstitution.
    new Notification({ userId: bettor, type: 'nope' as never, title: 'x', body: 'y' })
  expect(build).toThrow(ValidationError)
})

test('a fresh notification is unread', () => {
  const notification = Notification.for({ userId: bettor, type: 'account_approved' })
  expect(notification.isRead).toBe(false)
  expect(notification.readAt).toBeNull()
})

test('markAsRead is idempotent — the second call keeps the first timestamp', () => {
  const notification = Notification.for({ userId: bettor, type: 'account_approved' })
  notification.markAsRead()
  const firstRead = notification.readAt

  notification.markAsRead()

  expect(notification.readAt).toBe(firstRead)
})

test('a winning bet says how much it paid and links to the match', () => {
  const notification = Notification.for({
    userId: bettor,
    type: 'bet_won',
    marketKind: 'match',
    marketId: 'match-1',
    marketTitle: 'Faker vs Chovy',
    payout: 123456,
    referenceId: 'bet-1',
  })

  expect(notification.title).toBe('Aposta vencedora')
  expect(notification.body).toContain('Faker vs Chovy')
  expect(notification.body).toContain('R$ 1.234,56')
  expect(notification.link).toBe('/matches/match-1')
})

test('an outright bet links to the tournament, not the match', () => {
  const notification = Notification.for({
    userId: bettor,
    type: 'bet_lost',
    marketKind: 'tournament',
    marketId: 'cup-1',
    marketTitle: 'Copa Devs',
    stake: 500,
  })

  expect(notification.link).toBe('/tournaments/cup-1')
  expect(notification.body).toContain('R$ 5,00')
})

test('a combo says how many legs it had and links to the tickets page', () => {
  const notification = Notification.for({
    userId: bettor,
    type: 'combo_won',
    legs: 3,
    payout: 10000,
  })

  expect(notification.body).toContain('3 seleções')
  expect(notification.body).toContain('R$ 100,00')
  expect(notification.link).toBe('/bets')
})

test('money notifications link to the wallet', () => {
  const confirmed = Notification.for({ userId: bettor, type: 'deposit_confirmed', amount: 2550 })
  const paid = Notification.for({ userId: bettor, type: 'withdrawal_paid', amount: 2550 })

  expect(confirmed.body).toContain('R$ 25,50')
  expect(confirmed.link).toBe('/wallet')
  expect(paid.link).toBe('/wallet')
})

test("admin notifications link to the control room and name what's waiting", () => {
  const signup = Notification.for({
    userId: 'admin-1',
    type: 'admin_signup_pending',
    signupEmail: 'amigo@exemplo.com',
  })
  const deposit = Notification.for({
    userId: 'admin-1',
    type: 'admin_deposit_pending',
    bettorLabel: 'a1b2c3d4',
    amount: 1000,
  })

  expect(signup.body).toContain('amigo@exemplo.com')
  expect(signup.link).toBe('/admin')
  expect(deposit.body).toContain('a1b2c3d4')
  expect(deposit.body).toContain('R$ 10,00')
})

test('sending a batch delivers one notification per item', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      { userId: bettor, type: 'account_approved' },
      { userId: other, type: 'account_approved' },
    ],
  })

  expect(repository.notifications).toHaveLength(2)
})

test('an empty batch touches nothing', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({ items: [] })
  expect(repository.notifications).toHaveLength(0)
})

test('re-delivering the SAME event does not duplicate the inbox line', async () => {
  const repository = new NotificationRepositoryInMemory()
  const items = [
    {
      userId: bettor,
      type: 'bet_won' as const,
      marketKind: 'match' as const,
      marketId: 'match-1',
      marketTitle: 'Faker vs Chovy',
      payout: 1000,
      referenceId: 'bet-1',
    },
  ]

  // A settlement job that got retried replays the exact same batch.
  await new SendNotifications(repository).execute({ items })
  await new SendNotifications(repository).execute({ items })

  expect(repository.notifications).toHaveLength(1)
})

test('the feed lists the newest first and counts every unread', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      { userId: bettor, type: 'deposit_confirmed', amount: 100, referenceId: 'pay-1' },
      { userId: bettor, type: 'deposit_confirmed', amount: 200, referenceId: 'pay-2' },
      { userId: other, type: 'deposit_confirmed', amount: 300, referenceId: 'pay-3' },
    ],
  })
  // Same millisecond otherwise — force a distinct order.
  repository.notifications[0].createdAt = new Date('2026-01-01T10:00:00Z')
  repository.notifications[1].createdAt = new Date('2026-01-01T11:00:00Z')

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: bettor })

  expect(feed.items).toHaveLength(2) // never sees the other user's line
  expect(feed.items[0].body).toContain('R$ 2,00')
  expect(feed.unreadCount).toBe(2)
})

test('the unread count covers the whole inbox, not just the returned slice', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: Array.from({ length: 5 }, (_, index) => ({
      userId: bettor,
      type: 'deposit_confirmed' as const,
      amount: 100,
      referenceId: `pay-${index}`,
    })),
  })

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: bettor, limit: 2 })

  expect(feed.items).toHaveLength(2)
  expect(feed.unreadCount).toBe(5)
})

test('an absurd limit is clamped instead of dumping the table', async () => {
  const asked: number[] = []
  const spy = {
    async listByUserQuery(_userId: string, limit: number) {
      asked.push(limit)
      return []
    },
    async countUnreadQuery() {
      return 0
    },
  }

  await new ListMyNotificationsQuery(spy).execute({ userId: bettor, limit: 9999 })
  await new ListMyNotificationsQuery(spy).execute({ userId: bettor, limit: 0 })

  expect(asked).toEqual([100, 1])
})

test('marking as read clears it from the unread count', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [{ userId: bettor, type: 'account_approved' }],
  })
  const id = repository.notifications[0].id

  await new MarkNotificationAsRead(repository).execute({ notificationId: id, userId: bettor })

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: bettor })
  expect(feed.unreadCount).toBe(0)
  expect(feed.items[0].read).toBe(true)
})

test("someone else's notification answers like a missing one (anti-IDOR)", async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [{ userId: bettor, type: 'account_approved' }],
  })
  const id = repository.notifications[0].id

  const steal = new MarkNotificationAsRead(repository).execute({
    notificationId: id,
    userId: other,
  })

  await expect(steal).rejects.toBeInstanceOf(NotFoundError)
  await expect(steal).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
  expect(repository.notifications[0].readAt).toBeNull() // untouched
})

test('marking a missing notification fails with NOTIFICATION_NOT_FOUND', async () => {
  const repository = new NotificationRepositoryInMemory()
  const mark = new MarkNotificationAsRead(repository).execute({
    notificationId: 'ghost',
    userId: bettor,
  })
  await expect(mark).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
})

test('marking all as read only touches my own inbox', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      { userId: bettor, type: 'deposit_confirmed', amount: 100, referenceId: 'pay-1' },
      { userId: bettor, type: 'deposit_confirmed', amount: 200, referenceId: 'pay-2' },
      { userId: other, type: 'deposit_confirmed', amount: 300, referenceId: 'pay-3' },
    ],
  })

  await new MarkAllNotificationsAsRead(repository).execute({ userId: bettor })

  expect(await repository.countUnreadQuery(bettor)).toBe(0)
  expect(await repository.countUnreadQuery(other)).toBe(1)
})

test('deleting a notification removes it from the inbox', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      { userId: bettor, type: 'deposit_confirmed', amount: 100, referenceId: 'pay-1' },
      { userId: bettor, type: 'deposit_confirmed', amount: 200, referenceId: 'pay-2' },
    ],
  })
  const [first] = repository.notifications

  await new DeleteNotification(repository).execute({ notificationId: first.id, userId: bettor })

  const feed = await new ListMyNotificationsQuery(repository).execute({ userId: bettor })
  expect(feed.items).toHaveLength(1)
  expect(feed.items.some((item) => item.id === first.id)).toBe(false)
})

test("deleting someone else's notification answers like a missing one (anti-IDOR)", async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [{ userId: bettor, type: 'account_approved' }],
  })
  const id = repository.notifications[0].id

  const steal = new DeleteNotification(repository).execute({ notificationId: id, userId: other })

  await expect(steal).rejects.toBeInstanceOf(NotFoundError)
  await expect(steal).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
  expect(repository.notifications).toHaveLength(1) // untouched
})

test('deleting a missing notification fails with NOTIFICATION_NOT_FOUND', async () => {
  const repository = new NotificationRepositoryInMemory()
  const remove = new DeleteNotification(repository).execute({
    notificationId: 'ghost',
    userId: bettor,
  })
  await expect(remove).rejects.toMatchObject({ code: Errors.NOTIFICATION_NOT_FOUND })
})

test('clearing the inbox only empties my own', async () => {
  const repository = new NotificationRepositoryInMemory()
  await new SendNotifications(repository).execute({
    items: [
      { userId: bettor, type: 'deposit_confirmed', amount: 100, referenceId: 'pay-1' },
      { userId: bettor, type: 'deposit_confirmed', amount: 200, referenceId: 'pay-2' },
      { userId: other, type: 'deposit_confirmed', amount: 300, referenceId: 'pay-3' },
    ],
  })

  await new DeleteAllNotifications(repository).execute({ userId: bettor })

  expect((await new ListMyNotificationsQuery(repository).execute({ userId: bettor })).items).toHaveLength(0)
  expect((await new ListMyNotificationsQuery(repository).execute({ userId: other })).items).toHaveLength(1)
})
