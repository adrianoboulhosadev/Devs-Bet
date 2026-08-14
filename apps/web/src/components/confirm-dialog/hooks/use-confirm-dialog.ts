'use client'

import { useEffect, useState } from 'react'

/**
 * Returns whether the portal can be rendered yet, and wires Escape to cancel
 * while the dialog is open.
 */
export function useConfirmDialog(open: boolean, onCancel: () => void) {
  // Portals need the DOM, so the first (server) render has to bail out.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  return { mounted }
}
