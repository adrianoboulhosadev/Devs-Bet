'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useProfileStats } from '@/hooks/use-profile-stats'
import { NAV_ITEMS } from '../data/nav-items'

export function useSidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const { data: profile } = useProfileStats()
  // The rail widens on click (74px -> 252px) and reveals the labels.
  const [expanded, setExpanded] = useState(false)

  const displayName = profile?.nickname || user?.email.split('@')[0] || ''

  return {
    profile,
    logout,
    expanded,
    toggle: () => setExpanded((current) => !current),
    items: NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    isActive: (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    displayName,
    initials: displayName.slice(0, 2).toUpperCase(),
  }
}
