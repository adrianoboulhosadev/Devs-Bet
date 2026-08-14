'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { CategoryPicker } from '@/components/category-picker'
import { ParticipantPicker } from '@/components/participant-picker'
import { ImagePicker } from '@/components/image-picker'
import { MatchCard } from '@/components/match-card'
import { useMatches } from './hooks/use-matches'
import { MATCH_BEST_OF_OPTIONS } from './data/best-of-options'

export default function MatchesPage() {
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
          <h2 className="font-pixel text-xs tracking-wide text-arcade-amber">CRIAR PARTIDA</h2>
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
            {submitting ? 'Criando…' : 'Criar partida'}
          </Button>
        </form>
      )}

      <div className="space-y-3.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">FAÇA SUAS APOSTAS</h2>
        {loading ? (
          <Loading compact />
        ) : matches.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhuma partida ainda.
          </p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} categoryPath={pathOf(match.categoryId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
