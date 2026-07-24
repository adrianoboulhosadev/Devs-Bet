'use client'

import Link from 'next/link'
import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { CategoryPicker } from '@/components/category-picker'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { useMatches } from '../hooks/use-matches'

export function Matches() {
  const { isAdmin, matches, loading, categories, pathOf, form, participants, onSubmit, submitting, error } =
    useMatches()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Partidas</h1>

      {isAdmin && (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Criar partida</h2>
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
          <Field label="Data e hora" type="datetime-local" required {...form.register('scheduledAt')} />
          <Field label="Imagem (opcional)" type="file" accept="image/*" {...form.register('image')} />

          <div className="space-y-2">
            <span className="text-sm font-medium">Participantes</span>
            {participants.fields.map((fieldItem, index) => (
              <div key={fieldItem.id} className="flex items-center gap-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  placeholder={`Jogador ${index + 1}`}
                  {...form.register(`participants.${index}.displayName` as const)}
                />
                {participants.fields.length > 2 && (
                  <Button variant="secondary" onClick={() => participants.remove(index)}>
                    Remover
                  </Button>
                )}
              </div>
            ))}
            <Button variant="secondary" onClick={() => participants.append({ displayName: '' })}>
              + Participante
            </Button>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar partida'}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        <h2 className="font-medium">Lobby</h2>
        {loading ? (
          <Loading />
        ) : matches.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma partida ainda.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400"
                >
                  <div className="flex items-center gap-3">
                    {match.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(match.imageUrl)}
                        alt={match.title}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{match.title}</p>
                      <p className="text-sm text-slate-500">
                        {match.participants.map((participant) => participant.displayName).join(' × ')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {pathOf(match.categoryId)} · {formatDateTime(match.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={match.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
