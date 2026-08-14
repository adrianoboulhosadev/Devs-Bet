'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { colorForId, initialsOf } from '@/lib/participant-colors'
import { useDashboard } from './hooks/use-dashboard'
import { MATCH_FILTERS } from './data/match-filters'

/**
 * Landing screen: what the user's money is doing right now, then the board of
 * matches. It deliberately does NOT repeat the nav — the sidebar already links
 * to every section, so cards saying "go to Partidas" would be pure duplication.
 */
export default function DashboardPage() {
  const { pathOf, loading, summary, filter, setFilter, countsByStatus, matches, nextMatch } = useDashboard()

  if (loading) return <Loading />

  const positive = summary.netResult > 0
  const negative = summary.netResult < 0

  return (
    <div className="animate-scrIn space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden border-3 border-arcade-magenta bg-gradient-to-br from-[#2a1150] to-arcade-surface p-7 shadow-pixel-lg">
          <p className="font-pixel text-[9px] tracking-widest text-[#ff9ec4]">SEU BANCO DISPONÍVEL</p>
          <p className="my-2 text-6xl leading-none text-white [text-shadow:0_0_26px_rgba(255,61,129,.6),6px_6px_0_rgba(0,0,0,.5)] sm:text-7xl">
            {formatBRL(summary.available)}
          </p>
          <p className="font-arcade text-xl text-arcade-text-soft">
            você tem {formatBRL(summary.held)} em jogo · {summary.openCount} aposta
            {summary.openCount === 1 ? '' : 's'} em aberto
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matches">
              <button className="bg-arcade-amber px-5 py-3.5 font-pixel text-[11px] text-arcade-bg shadow-pixel-sm transition-transform hover:translate-x-0.5 hover:translate-y-0.5">
                ▸ APOSTAR AGORA
              </button>
            </Link>
            <Link href="/wallet">
              <button className="border-3 border-arcade-border px-5 py-3 font-pixel text-[11px] text-arcade-text hover:border-arcade-cyan hover:text-arcade-cyan">
                DEPOSITAR PIX
              </button>
            </Link>
          </div>
        </div>

        <div className="grid grid-rows-3 gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
            <div>
              <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">EM JOGO</p>
              <p className="text-4xl leading-tight text-arcade-cyan">{formatBRL(summary.held)}</p>
            </div>
            <p className="whitespace-pre-line text-right font-arcade text-lg text-arcade-text-muted">
              {summary.openCount} {summary.openCount === 1 ? 'aposta\naberta' : 'apostas\nabertas'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
            <div>
              <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">RESULTADO</p>
              <p className={`text-4xl leading-tight ${positive ? 'text-arcade-lime' : negative ? 'text-arcade-danger' : 'text-arcade-text'}`}>
                {positive ? '+' : ''}
                {formatBRL(summary.netResult)}
              </p>
            </div>
            <p className="whitespace-pre-line text-right font-arcade text-lg text-arcade-text-muted">
              {summary.settledCount === 0 ? 'nenhuma\nencerrada' : `${summary.wins} de ${summary.settledCount}\nencerradas`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-lime bg-arcade-surface px-5 py-4 shadow-pixel">
            <div>
              <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">RESULTADO GERAL</p>
              <p className="text-4xl leading-tight text-arcade-lime">{summary.wins} vitórias</p>
            </div>
            <p className="animate-bob font-arcade text-lg text-arcade-lime">▲▲▲</p>
          </div>
        </div>
      </div>

      {nextMatch && (
        <div className="flex flex-wrap items-center gap-4 border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <span className="animate-blink whitespace-nowrap font-pixel text-[10px] tracking-widest text-arcade-magenta">
            PRÓXIMA PARTIDA
          </span>
          <span className="min-w-[200px] flex-1 truncate font-arcade text-xl text-arcade-text">
            {nextMatch.title} — {nextMatch.participants.map((participant) => participant.displayName).join(' × ')}
          </span>
          <span className="whitespace-nowrap font-pixel text-sm text-arcade-amber [text-shadow:0_0_14px_rgba(255,176,32,.5)]">
            {formatDateTime(nextMatch.scheduledAt)}
          </span>
        </div>
      )}

      <div className="space-y-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
          <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">MESAS ABERTAS</h2>
          <Link href="/tournaments" className="font-arcade text-lg text-arcade-text-muted underline">
            ver os torneios ▸
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {MATCH_FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
              className={`border-3 px-3.5 py-2 font-pixel text-[10px] tracking-wide transition-colors ${
                filter === entry.id
                  ? 'border-arcade-magenta bg-arcade-magenta text-arcade-bg'
                  : 'border-arcade-border text-arcade-text-soft hover:border-arcade-lime hover:text-arcade-lime'
              }`}
            >
              {entry.label}
              <span className={`ml-1.5 font-arcade text-base ${filter === entry.id ? 'text-arcade-bg/70' : 'text-arcade-text-muted'}`}>
                {countsByStatus[entry.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {matches.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhuma partida nesse filtro.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="flex flex-wrap items-center gap-3.5 border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-arcade-magenta hover:shadow-pixel-hover"
                >
                  <div className="flex flex-none items-center gap-2">
                    {match.participants.slice(0, 2).map((participant) => (
                      <span
                        key={participant.id}
                        className="grid h-11 w-11 flex-none place-items-center font-pixel text-[11px] text-arcade-bg"
                        style={{ backgroundColor: colorForId(participant.participantId) }}
                      >
                        {initialsOf(participant.displayName)}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-[150px] flex-1">
                    <p className="text-2xl leading-tight text-arcade-text">{match.title}</p>
                    <p className="font-arcade text-lg text-arcade-text-muted">
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
