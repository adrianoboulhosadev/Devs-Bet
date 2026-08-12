'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationFeedDTO } from '@notification/adapters'
import { api } from '@/lib/api'

export const NOTIFICATIONS_KEY = ['notifications']

// No websockets in this stack (and no reason to add them for a handful of
// friends): the inbox re-reads itself every minute, plus whenever the window
// regains focus, which is what makes a settled bet show up without a reload.
const POLL_INTERVAL_MS = 60_000

/**
 * The inbox, shared by the header bell (a short slice) and the notifications
 * page (a long one). Keyed by `limit` so the two keep their own cache, but any
 * write invalidates the whole `['notifications']` prefix — marking one as read
 * in the bell updates the page too, and vice versa.
 */
export function useNotifications(limit?: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit ?? null],
    queryFn: async (): Promise<NotificationFeedDTO> =>
      (await api.get<NotificationFeedDTO>('/notification', { params: { limit } })).data,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.post(`/notification/${notificationId}/read`)
    },
    onSuccess: invalidate,
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.post('/notification/read-all')
    },
    onSuccess: invalidate,
  })

  return {
    items: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    loading: query.isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    markingAll: markAllAsRead.isPending,
  }
}
