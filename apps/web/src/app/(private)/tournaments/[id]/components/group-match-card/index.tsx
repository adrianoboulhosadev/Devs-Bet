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
    <div className="border-3 border-arcade-border bg-arcade-surface p-3 font-arcade text-lg shadow-pixel-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-arcade-text">{match.playerA.displayName}</span>
        <span className="font-pixel text-[8px] text-arcade-text-muted">VS</span>
        <span className="text-arcade-text">{match.playerB.displayName}</span>
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

          {canDeclare && liveMatch.data && (
            <div className="flex flex-wrap gap-2">
              {liveMatch.data.participants.map((participant) => (
                <Button key={participant.id} variant="warning" disabled={declaring} onClick={() => onDeclare(match.matchId!, participant.id)}>
                  {participant.displayName} venceu{liveMatch.data!.bestOf > 1 ? ' a unidade' : ''}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-base text-arcade-text-muted">Aguardando criação da partida.</p>
      )}
    </div>
  )
}
