'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { CategoryPicker } from '@/components/category-picker'
import { ParticipantPicker } from '@/components/participant-picker'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { useTournaments, TOURNAMENT_SIZES, TOURNAMENT_BEST_OF_OPTIONS } from '../hooks/use-tournaments'

export function Tournaments() {
  const {
    isAdmin,
    tournaments,
    loading,
    categories,
    pathOf,
    participants,
    form,
    roundCount,
    roundLabel,
    onSubmit,
    submitting,
  } = useTournaments()
  const size = Number(form.watch('size'))

  return (
    <div className="animate-scrIn space-y-7">
      {isAdmin && (
        <form onSubmit={onSubmit} className="space-y-5 border-3 border-arcade-purple bg-arcade-surface p-6 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-wide text-arcade-purple">CRIAR TORNEIO</h2>
          <Field label="TÍTULO" required {...form.register('title')} />
          <div className="space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">CATEGORIA</span>
            <CategoryPicker
              categories={categories}
              value={form.watch('categoryId') || null}
              onChange={(leafId) => form.setValue('categoryId', leafId ?? '')}
            />
          </div>
          <Field label="INÍCIO" type="datetime-local" required {...form.register('scheduledAt')} />

          <label className="block space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">PARTICIPANTES</span>
            <select
              className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan"
              {...form.register('size', { valueAsNumber: true })}
            >
              {TOURNAMENT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} participantes
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2.5">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">MELHOR DE (POR RODADA)</span>
            {Array.from({ length: roundCount }, (_, round) => (
              <label key={round} className="flex items-center justify-between gap-2.5 font-arcade text-lg">
                <span className="text-arcade-text-soft">{roundLabel(round)}</span>
                <select
                  className="border-3 border-arcade-border bg-[#0b0714] px-3 py-2 text-arcade-text outline-none focus:border-arcade-cyan"
                  {...form.register(`bestOfByRound.${round}` as const, { valueAsNumber: true })}
                >
                  {TOURNAMENT_BEST_OF_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 1 ? 'Jogo único (MD1)' : `${option} (MD${option})`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <Field label="IMAGEM (OPCIONAL)" type="file" accept="image/*" {...form.register('image')} />

          <ParticipantPicker
            participants={participants}
            value={form.watch('participantIds')}
            onChange={(ids) => form.setValue('participantIds', ids)}
            max={size}
          />

          <Button type="submit" className="bg-arcade-purple shadow-[6px_6px_0_#5f2f80] hover:shadow-[3px_3px_0_#5f2f80]" disabled={submitting}>
            {submitting ? 'Criando…' : 'Abrir torneio'}
          </Button>
        </form>
      )}

      <div className="space-y-3.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">CHAVES E CAMPEÕES</h2>
        {loading ? (
          <Loading />
        ) : tournaments.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhum torneio ainda.
          </p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="block border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:border-arcade-lime hover:shadow-pixel-hover"
              >
                <div className="flex items-center justify-between border-b-3 border-arcade-border-strong bg-[#1d1233] px-4 py-2.5">
                  <span className="text-2xl text-arcade-text">{tournament.title}</span>
                  <StatusBadge status={tournament.status} />
                </div>
                {tournament.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(tournament.imageUrl)} alt={tournament.title} className="h-32 w-full border-b-3 border-arcade-border-strong object-cover" />
                )}
                <div className="p-4">
                  <p className="font-arcade text-lg text-arcade-text-muted">{tournament.size} participantes</p>
                  <p className="mt-1 font-arcade text-base text-arcade-text-muted">
                    {pathOf(tournament.categoryId)} · {formatDateTime(tournament.scheduledAt)}
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
