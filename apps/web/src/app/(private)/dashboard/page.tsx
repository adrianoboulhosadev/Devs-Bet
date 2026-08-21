'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Loading } from '@/components/loading'
import { MatchCard } from '@/components/match-card'
import { TournamentCard } from '@/components/tournament-card'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useDashboard } from './hooks/use-dashboard'
import { MATCH_FILTERS } from './data/match-filters'

/**
 * Landing screen: what the user's money is doing right now, then the board of
 * matches. It deliberately does NOT repeat the nav — the sidebar already links
 * to every section, so cards saying "go to Partidas" would be pure duplication.
 */
export default function DashboardPage() {
  const { pathOf, loading, summary, filter, setFilter, countsByStatus, matches, nextMatch, openTournaments } =
    useDashboard()

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
          {/* Era uma linha só com `truncate`, então no celular o confronto
              sumia num "…" bem no meio dos nomes. Empilhado (nome / VS / nome)
              ninguém é cortado; de `sm` pra cima os três voltam pra mesma
              linha, onde há largura de sobra. */}
          <span className="min-w-[200px] flex-1 font-arcade text-xl text-arcade-text">
            <span className="block break-words text-arcade-text-soft">{nextMatch.title}</span>
            <span className="mt-1 flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
              {nextMatch.participants.map((participant, index) => (
                <Fragment key={participant.id}>
                  {index > 0 && (
                    <span className="font-pixel text-[9px] text-arcade-magenta">VS</span>
                  )}
                  <span className="break-words">{participant.displayName}</span>
                </Fragment>
              ))}
            </span>
          </span>
          <span className="whitespace-nowrap font-pixel text-sm text-arcade-amber [text-shadow:0_0_14px_rgba(255,176,32,.5)]">
            {formatDateTime(nextMatch.scheduledAt)}
          </span>
        </div>
      )}

      <div className="space-y-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
          <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">APOSTAS</h2>
          <Link href="/matches" className="font-arcade text-lg text-arcade-text-muted underline">
            ver todas ▸
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
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} categoryPath={pathOf(match.categoryId)} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
          <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">TORNEIOS</h2>
          <Link href="/tournaments" className="font-arcade text-lg text-arcade-text-muted underline">
            ver todos ▸
          </Link>
        </div>

        {openTournaments.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Não há nenhum torneio em aberto no momento.
          </p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {openTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} categoryPath={pathOf(tournament.categoryId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
