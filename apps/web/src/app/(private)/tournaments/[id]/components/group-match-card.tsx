'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { GroupMatchDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'

interface GroupMatchCardProps {
  match: GroupMatchDTO
  isAdmin: boolean
  declaring: boolean
  onDeclare: (matchId: string, winnerParticipantId: string) => void
}

/**
 * One round-robin matchup within a group. Mirrors BracketSlotCard (same
 * declare-result flow, through the tournament's own result route — group
 * matches settle and get bet on exactly like a bracket confrontation), except
 * both players are always known upfront here.
 */
export function GroupMatchCard({ match, isAdmin, declaring, onDeclare }: GroupMatchCardProps) {
  const liveMatch = useQuery({
    queryKey: ['match', match.matchId],
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${match.matchId}`)).data,
    enabled: Boolean(match.matchId),
  })

  const status = liveMatch.data?.status
  const canDeclare = isAdmin && (status === 'open' || status === 'locked')
  const winnerName = liveMatch.data?.participants.find(
    (participant) => participant.id === liveMatch.data?.winnerParticipantId,
  )?.displayName

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{match.playerA.displayName}</span>
        <span className="text-xs text-slate-400">vs</span>
        <span className="font-medium">{match.playerB.displayName}</span>
      </div>

      {match.matchId ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            {status ? <StatusBadge status={status} /> : <span className="text-xs text-slate-400">…</span>}
            <Link
              href={`/matches/${match.matchId}`}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Ver / Apostar →
            </Link>
          </div>

          {status === 'settled' && (
            <p className="text-xs text-emerald-700">Vencedor: {winnerName ?? '—'}</p>
          )}

          {liveMatch.data && liveMatch.data.bestOf > 1 && (
            <p className="text-xs text-slate-500">
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

          {canDeclare && liveMatch.data && (
            <div className="flex flex-wrap gap-2">
              {liveMatch.data.participants.map((participant) => (
                <Button
                  key={participant.id}
                  disabled={declaring}
                  onClick={() => onDeclare(match.matchId!, participant.id)}
                >
                  {participant.displayName} venceu{liveMatch.data!.bestOf > 1 ? ' o game' : ''}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Aguardando criação da partida.</p>
      )}
    </div>
  )
}
