'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { CategoryPicker } from '@/components/category-picker'
import { ParticipantPicker } from '@/components/participant-picker'
import { ImagePicker } from '@/components/image-picker'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { useMatches, MATCH_BEST_OF_OPTIONS } from '../hooks/use-matches'

export function Matches() {
  const { isAdmin, matches, loading, categories, pathOf, participants, form, onSubmit, submitting } =
    useMatches()
  const bestOf = form.watch('bestOf')

  return (
    <div className="animate-scrIn space-y-7">
      {isAdmin && (
        <form
          onSubmit={onSubmit}
          className="space-y-5 border-3 border-arcade-amber bg-arcade-surface p-6 shadow-pixel-lg"
        >
          <h2 className="font-pixel text-xs tracking-wide text-arcade-amber">CRIAR MESA</h2>
          <Field label="TÍTULO" required {...form.register('title')} />
          <div className="space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">CATEGORIA</span>
            <CategoryPicker
              categories={categories}
              value={form.watch('categoryId') || null}
              onChange={(leafId) => form.setValue('categoryId', leafId ?? '')}
            />
          </div>
          <Field label="DATA E HORA" type="datetime-local" required {...form.register('scheduledAt')} />
          <ImagePicker
            label="IMAGEM (OPCIONAL)"
            preset="banner"
            value={form.watch('image')}
            onChange={(file) => form.setValue('image', file)}
          />

          <label className="block space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">MELHOR DE</span>
            <select
              className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan"
              {...form.register('bestOf', { valueAsNumber: true })}
            >
              {MATCH_BEST_OF_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 1 ? 'Jogo único (MD1)' : `${option} (MD${option})`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 font-arcade text-lg leading-snug text-arcade-text-soft">
            <input
              type="checkbox"
              disabled={bestOf !== 1}
              {...form.register('allowsDraw')}
              className="mt-0.5 h-5 w-5 flex-none accent-arcade-amber"
            />
            Permite empate — vira uma seleção extra pra apostar (só em MD1)
          </label>

          <ParticipantPicker
            participants={participants}
            value={form.watch('participantIds')}
            onChange={(ids) => form.setValue('participantIds', ids)}
          />

          <Button type="submit" variant="warning" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar mesa'}
          </Button>
        </form>
      )}

      <div className="space-y-3.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">ESCOLHA SUA MESA</h2>
        {loading ? (
          <Loading />
        ) : matches.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhuma partida ainda.
          </p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="block border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:border-arcade-magenta hover:shadow-pixel-hover"
              >
                <div className="flex items-center justify-between border-b-3 border-arcade-border-strong bg-[#1d1233] px-4 py-2.5">
                  <span className="font-pixel text-[8px] tracking-widest text-arcade-text-muted">
                    {pathOf(match.categoryId).toUpperCase()}
                  </span>
                  <StatusBadge status={match.status} />
                </div>
                {match.imageUrl && (
                  // aspect-video matches the cropper's banner preset, so the card
                  // shows exactly the framing that was chosen — no extra cropping.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(match.imageUrl)} alt={match.title} className="aspect-video w-full border-b-3 border-arcade-border-strong object-cover" />
                )}
                <div className="p-4">
                  <p className="mb-2 text-2xl leading-tight text-arcade-text">{match.title}</p>
                  <p className="font-arcade text-lg text-arcade-text-muted">
                    {match.participants.map((participant) => participant.displayName).join(' × ')}
                  </p>
                  <p className="mt-1 font-arcade text-base text-arcade-text-muted">
                    {formatDateTime(match.scheduledAt)}
                    {match.bestOf > 1 && ` · MD${match.bestOf}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
