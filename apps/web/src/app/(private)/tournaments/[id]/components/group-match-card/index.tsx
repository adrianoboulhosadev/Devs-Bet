'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { GroupMatchDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { ParticipantAvatar } from '@/components/participant-avatar'

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
      {/* Foto + nome, mesma leitura do card da chave (ver BracketSlotCard). */}
      <div className="space-y-1.5">
        {[match.playerA, match.playerB].map((player) => (
          <div key={player.id} className="flex items-center gap-2.5">
            <ParticipantAvatar
              id={player.participantId}
              name={player.displayName}
              imageUrl={player.imageUrl}
              className="h-8 w-8"
              textClassName="text-[8px]"
            />
            <span title={player.displayName} className="min-w-0 flex-1 truncate text-arcade-text">
              {player.displayName}
            </span>
          </div>
        ))}
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
