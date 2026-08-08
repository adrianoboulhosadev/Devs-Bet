'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * shadcn's toast (sonner) — the single place feedback is shown. Mounted once in
 * the root layout; anywhere else, just call `notify` (see lib/notify).
 *
 * shadcn's stock component reads the active theme from next-themes; this app is
 * light-only, so the palette is pinned to the same slate/red/emerald tokens the
 * rest of the UI uses (see components/button).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'group flex w-full items-center gap-3 rounded-lg border p-4 text-sm shadow-lg',
          // `default` is applied to EVERY toast, not just untyped ones, so its
          // neutral palette competes with the per-type one below. Tailwind
          // settles conflicting utilities by their order in the compiled CSS
          // (not by class order), which made the winner arbitrary — every toast
          // came out white. The `!` modifier makes the per-type colour win.
          default: 'border-slate-200 bg-white text-slate-900',
          success: '!border-emerald-200 !bg-emerald-50 !text-emerald-900',
          error: '!border-red-200 !bg-red-50 !text-red-900',
          info: '!border-sky-200 !bg-sky-50 !text-sky-900',
          warning: '!border-amber-200 !bg-amber-50 !text-amber-900',
          title: 'font-medium',
          description: 'opacity-80',
          icon: 'shrink-0',
          actionButton: 'rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white',
          cancelButton: 'rounded-md border border-slate-300 px-2 py-1 text-xs font-medium',
          closeButton: 'border-slate-300 bg-white text-slate-500 hover:text-slate-900',
        },
      }}
    />
  )
}
