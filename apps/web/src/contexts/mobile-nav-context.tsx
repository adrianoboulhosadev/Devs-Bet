'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Whether the navigation rail is showing as an overlay drawer. Only used below
 * the `lg` breakpoint: from there up the rail is part of the layout and is
 * always visible, so this state is simply ignored.
 *
 * It lives in a context because the button that opens the drawer is in the
 * Header and the drawer itself is the Sidebar — two siblings the private layout
 * mounts side by side, with no component owning both.
 */
interface MobileNav {
  open: boolean
  toggle: () => void
  close: () => void
}

const MobileNavContext = createContext<MobileNav | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  // Same escape hatch the notification panel gives: an overlay that covers the
  // screen has to be dismissable from the keyboard.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const value = useMemo(
    () => ({ open, toggle: () => setOpen((current) => !current), close }),
    [open, close],
  )

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
}

export function useMobileNav(): MobileNav {
  const context = useContext(MobileNavContext)
  if (!context) throw new Error('useMobileNav must be used inside a MobileNavProvider')
  return context
}
