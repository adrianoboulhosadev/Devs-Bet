'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_URL, getAccessToken, onAccessTokenChange } from '@/lib/api'
import { NOTIFICATIONS_KEY } from './use-notifications'

/**
 * Keeps the inbox AND the money on screen live. Replaced the bell's 60s
 * polling: the backend pushes a ping whenever THIS user's inbox changes (see
 * the notification context in CLAUDE.md) and the only thing this does with it
 * is invalidate the affected queries — TanStack Query then re-reads them,
 * exactly as if the user had navigated.
 *
 * The ping means "something of yours happened", and almost everything a bettor
 * is notified about IS a balance move: a deposit confirmed or rejected by the
 * admin, a withdrawal paid, a bet or a combo settled. So the wallet and the
 * payment list are invalidated alongside the inbox — otherwise the admin
 * approves a credit request, the notification lands in the bell, and the
 * balance in the header keeps showing the old number until the user hits F5.
 * (The two notifications that move no money — an approved account, an admin
 * pending-queue line — cost one cheap re-read of /wallet/me, which is a far
 * better trade than teaching the payload to carry a topic just to skip it.)
 *
 * EventSource, not WebSocket: traffic only flows server → browser, and
 * EventSource RECONNECTS BY ITSELF after a drop (a backend restart, a flaky
 * network), which is the behavior wanted here for free.
 *
 * The token goes in the query string because EventSource cannot send an
 * Authorization header — the connection is therefore recreated whenever the
 * token rotates (login, silent refresh, logout), which is what
 * onAccessTokenChange is for. Mounted ONCE, in the private layout.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient()
  // Not a ref: the token arriving/rotating has to RE-RUN the effect below, and
  // only state does that.
  const [token, setToken] = useState<string | null>(() => getAccessToken())

  useEffect(() => onAccessTokenChange(setToken), [])

  useEffect(() => {
    if (!token) return

    const source = new EventSource(
      `${API_URL}/notification/stream?token=${encodeURIComponent(token)}`,
      { withCredentials: true },
    )

    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }

    // No manual retry here on purpose: EventSource already reconnects on its
    // own. Closing it would be what BREAKS that. An expired token is the one
    // case it cannot recover from by itself, and that resolves via the effect
    // re-running when the silent refresh rotates the token.
    return () => source.close()
  }, [token, queryClient])
}
