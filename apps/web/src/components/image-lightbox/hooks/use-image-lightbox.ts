'use client'

import { useEffect, useState } from 'react'

/** Same shape as ConfirmDialog's own mount+Escape hook, kept local to this
 * component instead of reaching into another component's private hook. */
export function useImageLightbox(open: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return { mounted }
}
