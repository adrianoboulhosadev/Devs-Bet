'use client'

import { Button } from '../button'
import { useCommentComposer } from './hooks/use-comment-composer'

// Mirrors CommentBody.MAX_LENGTH in packages/comment/core (the front cannot
// import a core package, and the web only ever imports TYPES from adapters).
// The backend rejects a longer text regardless — this is just so the UI does
// not invite an action that will fail.
const MAX_LENGTH = 1000
// Past this the counter appears, so a normal comment is not nagged at.
const COUNTER_THRESHOLD = MAX_LENGTH - 200

interface CommentComposerProps {
  onSubmit: (body: string) => void
  submitLabel: string
  placeholder?: string
  initialValue?: string
  busy?: boolean
  /** Shows a cancel button (used when editing or replying, not on the main box). */
  onCancel?: () => void
  autoFocus?: boolean
}

/** The text box, shared by the three places one is needed: a new comment, a
 * reply and an edit. */
export function CommentComposer({
  onSubmit,
  submitLabel,
  placeholder = 'Escreva um comentário…',
  initialValue = '',
  busy = false,
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const { form, body, submit } = useCommentComposer(initialValue, onSubmit, !initialValue)
  const remaining = MAX_LENGTH - body.length

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <textarea
        {...form.register('body', { maxLength: MAX_LENGTH })}
        rows={3}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={submitLabel}
        className="block w-full resize-y border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-lg leading-snug text-arcade-text outline-none transition-colors placeholder:text-arcade-text-muted focus:border-arcade-cyan"
      />
      {/* flex-wrap, not a two-column grid: on a narrow screen the counter and
          the buttons each get their own line instead of squeezing the labels. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {body.length > COUNTER_THRESHOLD && (
          <span
            className={`mr-auto font-arcade text-base ${remaining < 0 ? 'text-arcade-danger' : 'text-arcade-text-muted'}`}
          >
            {remaining} caracteres
          </span>
        )}
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy || body.trim().length === 0}>
          {busy ? 'Enviando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
