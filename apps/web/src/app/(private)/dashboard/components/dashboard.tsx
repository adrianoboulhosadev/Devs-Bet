'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useDashboard, MATCH_FILTERS } from '../hooks/use-dashboard'

/**
 * Landing screen: what the user's money is doing right now, then the board of
 * matches. It deliberately does NOT repeat the nav — the top bar already links
 * to every section, so cards saying "go to Partidas" were pure duplication.
 */
export function Dashboard() {
  const { user, pathOf, loading, summary, filter, setFilter, countsByStatus, matches } = useDashboard()

  if (loading) return <Loading />

  const positive = summary.netResult > 0
  const negative = summary.netResult < 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      {/* Hero figure — the one number the screen leads with — plus the tiles that
          qualify it. Exactly one hero per view (see the stat-tile contract). */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:col-span-2">
          <p className="text-sm text-slate-500">Saldo disponível</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{formatBRL(summary.available)}</p>
          <Link href="/wallet" className="mt-2 inline-block text-sm text-slate-500 underline">
            depositar ou sacar
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Em jogo</p>
          <p className="mt-1 text-2xl font-semibold">{formatBRL(summary.held)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.openCount} {summary.openCount === 1 ? 'aposta aberta' : 'apostas abertas'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Resultado</p>
          {/* Signed and labelled: the sign and the word carry the meaning, the
              colour only reinforces it. */}
          <p
            className={`mt-1 text-2xl font-semibold ${
              positive ? 'text-emerald-700' : negative ? 'text-red-700' : ''
            }`}
          >
            {positive ? '+' : ''}
            {formatBRL(summary.netResult)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.settledCount === 0
              ? 'nenhuma aposta encerrada'
              : `${summary.wins} de ${summary.settledCount} encerradas`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Partidas</h2>
          <Link href="/tournaments" className="text-sm text-slate-500 underline">
            ver torneios
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {MATCH_FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === entry.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {entry.label}
              <span className={`ml-1.5 text-xs ${filter === entry.id ? 'text-slate-300' : 'text-slate-400'}`}>
                {countsByStatus[entry.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {matches.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
            Nenhuma partida nesse filtro.
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{match.title}</p>
                    <p className="truncate text-sm text-slate-500">
                      {match.participants.map((participant) => participant.displayName).join(' × ')}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {pathOf(match.categoryId)} · {formatDateTime(match.scheduledAt)}
                      {match.bestOf > 1 && ` · MD${match.bestOf}`}
                    </p>
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
