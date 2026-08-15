'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { GroupMatchDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'

interface GroupMatchCardProps {
  match: GroupMatchDTO
}

/**
 * One round-robin matchup within a group. Mirrors BracketSlotCard: a link
 * into the match page, no declare-result button here any more — that only
 * happens on the match's own "Sala de Controle" now.
 */
export function GroupMatchCard({ match }: GroupMatchCardProps) {
  const liveMatch = useQuery({
    queryKey: ['match', match.matchId],
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${match.matchId}`)).data,
    enabled: Boolean(match.matchId),
  })

  const status = liveMatch.data?.status
  const winnerName = liveMatch.data?.participants.find(
    (participant) => participant.id === liveMatch.data?.winnerParticipantId,
  )?.displayName

  return (
    <div className="border-3 border-arcade-border bg-arcade-surface p-3 font-arcade text-lg shadow-pixel-sm">
      {/* Same three-column layout as BracketSlotCard — see the note there. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <span className="min-w-0 break-words text-right text-arcade-text">{match.playerA.displayName}</span>
        <span className="font-pixel text-[8px] text-arcade-text-muted">VS</span>
        <span className="min-w-0 break-words text-left text-arcade-text">{match.playerB.displayName}</span>
      </div>

      {match.matchId ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            {status ? <StatusBadge status={status} /> : <span className="text-arcade-text-muted">…</span>}
            <Link href={`/matches/${match.matchId}`} className="text-base text-arcade-cyan hover:underline">
              Ver / Apostar →
            </Link>
          </div>

          {status === 'settled' && <p className="text-base text-arcade-lime">Vencedor: {winnerName ?? '—'}</p>}

          {liveMatch.data && liveMatch.data.bestOf > 1 && (
            <p className="text-base text-arcade-text-muted">
              Melhor de {liveMatch.data.bestOf} · placar:{' '}
              {liveMatch.data.participants
                .map(
                  (participant) =>
                    liveMatch.data!.units.filter((unit) => unit.winnerParticipantId === participant.id)
                      .length,
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
