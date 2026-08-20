'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMobileNav } from '@/contexts/mobile-nav-context'
import { useProfileStats } from '@/hooks/use-profile-stats'
import { NAV_ITEMS } from '../data/nav-items'

export function useSidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const { data: profile } = useProfileStats()
  // Below `lg` the rail is an overlay drawer instead of a column of the layout,
  // so whether it shows at all is the header button's call, not this hook's.
  const { open: drawerOpen, close: closeDrawer } = useMobileNav()
  // The rail widens on click (74px -> 252px) and reveals the labels. Only from
  // `lg` up: the drawer always opens at full width, labels and all.
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
    drawerOpen,
    closeDrawer,
  }
}
