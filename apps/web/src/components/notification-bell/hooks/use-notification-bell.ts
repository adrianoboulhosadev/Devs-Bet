'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NotificationDTO } from '@notification/adapters'
import { useNotifications } from '@/hooks/use-notifications'

// How many lines the dropdown shows. The page shows the rest.
const PREVIEW_SIZE = 5

export function useNotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { items, unreadCount, markAsRead } = useNotifications(PREVIEW_SIZE)

  // Closing on an outside click needs the document, not the button: a click on
  // any other part of the page must dismiss the panel.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return {
    containerRef,
    open,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
    items,
    unreadCount,
    openNotification: (notification: NotificationDTO) => {
      if (!notification.read) markAsRead(notification.id)
      setOpen(false)
      if (notification.link) router.push(notification.link)
    },
  }
}
