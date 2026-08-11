'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Blocking confirmation for a destructive action (deleting a category, a
 * participant, cancelling a match/tournament) — those used to fire on a single
 * click with no way back.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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

  if (!open || !mounted) return null

  // Rendered into <body>, NOT where it is declared: as a child of the page the
  // overlay inherits the parent's layout — a `space-y-*` container, for one,
  // pushes a `margin-top` onto it and the full-screen backdrop stops covering
  // the top of the screen.
  return createPortal(
    <div className="fixed inset-0 z-[95] grid place-items-center bg-arcade-bg/80 px-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm space-y-4 border-3 border-arcade-magenta bg-arcade-surface p-6 shadow-pixel-lg"
      >
        <h2 className="font-pixel text-sm leading-relaxed text-arcade-text">{title}</h2>
        {description && <p className="font-arcade text-lg text-arcade-text-soft">{description}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" autoFocus onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
