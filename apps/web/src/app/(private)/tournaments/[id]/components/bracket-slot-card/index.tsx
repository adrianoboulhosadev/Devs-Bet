'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { BracketSlotDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'

interface BracketSlotCardProps {
  slot: BracketSlotDTO
}

/**
 * One confrontation in the bracket. When a Match is attached, it fetches it to
 * show the live status and a link into the match page — declaring the winner
 * happens there now (the match's own "Sala de Controle"), never from this
 * card, so there is exactly one place that can define a result.
 */
export function BracketSlotCard({ slot }: BracketSlotCardProps) {
  const match = useQuery({
    queryKey: ['match', slot.matchId],
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${slot.matchId}`)).data,
    enabled: Boolean(slot.matchId),
  })

  const nameA = slot.playerA?.displayName ?? 'A definir'
  const nameB = slot.playerB?.displayName ?? 'A definir'
  const status = match.data?.status
  const winnerName = match.data?.participants.find(
    (participant) => participant.id === match.data?.winnerParticipantId,
  )?.displayName

  return (
    <div className="border-3 border-arcade-border bg-arcade-surface p-3 font-arcade text-lg shadow-pixel-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-arcade-text">{nameA}</span>
        <span className="font-pixel text-[8px] text-arcade-text-muted">VS</span>
        <span className="text-arcade-text">{nameB}</span>
      </div>

      {slot.matchId ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            {status ? <StatusBadge status={status} /> : <span className="text-arcade-text-muted">…</span>}
            <Link href={`/matches/${slot.matchId}`} className="text-base text-arcade-cyan hover:underline">
              Ver / Apostar →
            </Link>
          </div>

          {status === 'settled' && <p className="text-base text-arcade-lime">Vencedor: {winnerName ?? '—'}</p>}

          {match.data && match.data.bestOf > 1 && (
            <p className="text-base text-arcade-text-muted">
              Melhor de {match.data.bestOf} · placar:{' '}
              {match.data.participants
                .map(
                  (participant) =>
                    match.data!.units.filter((unit) => unit.winnerParticipantId === participant.id)
                      .length,
                )
                .join('-')}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-base text-arcade-text-muted">Aguardando confronto anterior.</p>
      )}
    </div>
  )
}
