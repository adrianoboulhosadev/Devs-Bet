'use client'

import Link from 'next/link'
import type { GroupMatchDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { StatusBadge } from '@/components/status-badge'

interface GroupMatchCardProps {
  match: GroupMatchDTO
  /** A Match do confronto, buscada de uma vez pela tela (useTournamentMatches). */
  liveMatch: MatchDTO | undefined
}

/**
 * One round-robin matchup within a group. A link into the match page, no
 * declare-result button here — that only happens on the match's own
 * "Sala de Controle".
 */
export function GroupMatchCard({ match, liveMatch }: GroupMatchCardProps) {
  const status = liveMatch?.status
  const winnerName = liveMatch?.participants.find(
    (participant) => participant.id === liveMatch?.winnerParticipantId,
  )?.displayName

  return (
    <div className="border-3 border-arcade-border bg-arcade-surface p-3 font-arcade text-lg shadow-pixel-sm">
      {/* Stacked, not side by side: two full names in a row always wrapped into
          a ragged two-line block with the VS floating in the middle of it. */}
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="break-words text-arcade-text">{match.playerA.displayName}</span>
        <span className="font-pixel text-[8px] text-arcade-text-muted">VS</span>
        <span className="break-words text-arcade-text">{match.playerB.displayName}</span>
      </div>

      {match.matchId ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {status ? <StatusBadge status={status} /> : <span className="text-arcade-text-muted">…</span>}
            <Link href={`/matches/${match.matchId}`} className="text-base text-arcade-cyan hover:underline">
              Ver / Apostar →
            </Link>
          </div>

          {status === 'settled' && <p className="text-base text-arcade-lime">Vencedor: {winnerName ?? '—'}</p>}

          {liveMatch && liveMatch.bestOf > 1 && (
            <p className="text-base text-arcade-text-muted">
              Melhor de {liveMatch.bestOf} · placar:{' '}
              {liveMatch.participants
                .map(
                  (participant) =>
                    liveMatch.units.filter((unit) => unit.winnerParticipantId === participant.id).length,
                )
                .join('-')}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-base text-arcade-text-muted">Aguardando criação da partida.</p>
      )}
    </div>
  )
}
