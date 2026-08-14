'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * shadcn's toast (sonner) — the single place feedback is shown. Mounted once in
 * the root layout; anywhere else, just call `notify` (see lib/notify).
 *
 * Recolored to the retro-arcade palette (see components/button). `default` is
 * applied to EVERY toast, not just untyped ones, so its neutral palette
 * competes with the per-type one below — Tailwind settles conflicting
 * utilities by their order in the compiled CSS (not by class order), which
 * made the winner arbitrary. The `!` modifier makes the per-type colour win.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group flex w-full items-center gap-3 border-3 p-4 font-arcade text-lg shadow-pixel',
          default: 'border-arcade-border bg-arcade-surface text-arcade-text',
          success: '!border-arcade-lime !bg-arcade-surface !text-arcade-lime',
          error: '!border-arcade-danger !bg-arcade-surface !text-arcade-danger',
          info: '!border-arcade-cyan !bg-arcade-surface !text-arcade-cyan',
          warning: '!border-arcade-amber !bg-arcade-surface !text-arcade-amber',
          title: 'font-medium',
          description: 'opacity-80 text-arcade-text-soft',
          icon: 'shrink-0',
          actionButton: 'bg-arcade-magenta px-2 py-1 font-pixel text-[9px] text-arcade-bg',
          cancelButton: 'border-2 border-arcade-border px-2 py-1 font-pixel text-[9px] text-arcade-text',
          closeButton: 'border-arcade-border bg-arcade-surface text-arcade-text-muted hover:text-arcade-text',
        },
      }}
    />
  )
}
