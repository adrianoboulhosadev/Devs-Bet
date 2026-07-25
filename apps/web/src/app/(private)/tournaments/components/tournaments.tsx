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
    error,
  } = useTournaments()
  const size = Number(form.watch('size'))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Torneios</h1>

      {isAdmin && (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Criar torneio</h2>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Field label="Título" required {...form.register('title')} />
          <div className="space-y-1">
            <span className="text-sm font-medium">Categoria</span>
            <CategoryPicker
              categories={categories}
              value={form.watch('categoryId') || null}
              onChange={(leafId) => form.setValue('categoryId', leafId ?? '')}
            />
          </div>
          <Field label="Início" type="datetime-local" required {...form.register('scheduledAt')} />

          <label className="block space-y-1">
            <span className="text-sm font-medium">Participantes</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              {...form.register('size', { valueAsNumber: true })}
            >
              {TOURNAMENT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} participantes
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Melhor de (por rodada)</span>
            {Array.from({ length: roundCount }, (_, round) => (
              <label key={round} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">{roundLabel(round)}</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
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

          <Field label="Imagem (opcional)" type="file" accept="image/*" {...form.register('image')} />

          <ParticipantPicker
            participants={participants}
            value={form.watch('participantIds')}
            onChange={(ids) => form.setValue('participantIds', ids)}
            max={size}
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar torneio'}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        <h2 className="font-medium">Lista</h2>
        {loading ? (
          <Loading />
        ) : tournaments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum torneio ainda.</p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((tournament) => (
              <li key={tournament.id}>
                <Link
                  href={`/tournaments/${tournament.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400"
                >
                  <div className="flex items-center gap-3">
                    {tournament.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(tournament.imageUrl)}
                        alt={tournament.title}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{tournament.title}</p>
                      <p className="text-sm text-slate-500">{tournament.size} participantes</p>
                      <p className="text-xs text-slate-400">
                        {pathOf(tournament.categoryId)} · {formatDateTime(tournament.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={tournament.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
