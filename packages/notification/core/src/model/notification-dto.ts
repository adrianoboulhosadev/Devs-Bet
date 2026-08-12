import { NotificationType } from './notification-input'

/** READ projection (CQRS) of one inbox line. */
export interface NotificationDTO {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: Date
}

/**
 * What a single endpoint gives the front. The bell (limit 5) and the inbox page
 * (limit 50) read the SAME shape: `unreadCount` is the badge and always counts
 * the whole inbox, never just the slice that came back.
 */
export interface NotificationFeedDTO {
  unreadCount: number
  items: NotificationDTO[]
}
