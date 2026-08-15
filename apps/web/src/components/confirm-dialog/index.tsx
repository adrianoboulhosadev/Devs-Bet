'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../button'
import { useConfirmDialog } from './hooks/use-confirm-dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  // Extra form fields between the description and the buttons (e.g. a
  // mandatory reason or receipt upload) — the dialog stays the same chrome,
  // the caller owns the field's state.
  children?: ReactNode
  // Blocks confirming until a required field above is filled in.
  confirmDisabled?: boolean
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
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const { mounted } = useConfirmDialog(open, onCancel)

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

        {children}

        {/* flex-wrap is required, not decorative: the buttons are
            `whitespace-nowrap`, so a long confirm label ("Confirmar pagamento")
            makes the pair wider than the dialog's max-w-sm and the Cancel
            button spills out of the box. Wrapping drops it to its own line. */}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" autoFocus onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
