'use client'

import type { InboxFilter } from '../data/inbox-filters'

import { useMemo, useState } from 'react'
import { useNotifications } from '@/hooks/use-notifications'

// The full history the page offers. Matches the use case's ceiling, so asking
// for more would be clamped anyway.
const INBOX_SIZE = 100


/** State + data for the inbox page. The filter is client-side on purpose: the
 * whole page is already in memory, so a round trip to hide read lines would
 * only add latency. */
export function useNotificationsInbox() {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const { items, unreadCount, loading, markAsRead, markAllAsRead, markingAll, remove, removeAll, removingAll } =
    useNotifications(INBOX_SIZE)
  // Guard for the destructive "clear everything" action.
  const [confirmingClear, setConfirmingClear] = useState(false)

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((notification) => !notification.read) : items),
    [items, filter],
  )

  return {
    visible,
    unreadCount,
    total: items.length,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    markingAll,
    remove,
    removeAll,
    removingAll,
    confirmingClear,
    setConfirmingClear,
  }
}
