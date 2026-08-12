'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationFeedDTO } from '@notification/adapters'
import { api } from '@/lib/api'

export const NOTIFICATIONS_KEY = ['notifications']

/**
 * The inbox, shared by the header bell (a short slice) and the notifications
 * page (a long one). Keyed by `limit` so the two keep their own cache, but any
 * write invalidates the whole `['notifications']` prefix — marking one as read
 * in the bell updates the page too, and vice versa.
 *
 * NO POLLING (deliberately removed): the backend PUSHES a ping over SSE the
 * moment this user's inbox changes and useNotificationStream invalidates this
 * query, so it re-reads on the actual event instead of on a timer. A timer was
 * both slower (up to a minute late) and constant traffic for nothing.
 */
export function useNotifications(limit?: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit ?? null],
    queryFn: async (): Promise<NotificationFeedDTO> =>
      (await api.get<NotificationFeedDTO>('/notification', { params: { limit } })).data,
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
