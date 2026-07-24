'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { BracketSlotDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'

interface BracketSlotCardProps {
  slot: BracketSlotDTO
  isAdmin: boolean
  declaring: boolean
  onDeclare: (matchId: string, winnerParticipantId: string) => void
}

/**
 * One confrontation in the bracket. When a Match is attached, it fetches it to
 * show the live status, a link to bet on the match page, and (for admins) the
 * buttons to declare the winner — which settles the match AND advances the
 * bracket through the dedicated tournament route.
 */
export function BracketSlotCard({ slot, isAdmin, declaring, onDeclare }: BracketSlotCardProps) {
  const match = useQuery({
    queryKey: ['match', slot.matchId],
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${slot.matchId}`)).data,
    enabled: Boolean(slot.matchId),
  })

  const nameA = slot.playerA?.displayName ?? 'A definir'
  const nameB = slot.playerB?.displayName ?? 'A definir'
  const status = match.data?.status
  const canDeclare = isAdmin && (status === 'open' || status === 'locked')
  const winnerName = match.data?.participants.find(
    (participant) => participant.id === match.data?.winnerParticipantId,
  )?.displayName

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{nameA}</span>
        <span className="text-xs text-slate-400">vs</span>
        <span className="font-medium">{nameB}</span>
      </div>

      {slot.matchId ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            {status ? (
              <StatusBadge status={status} />
            ) : (
              <span className="text-xs text-slate-400">…</span>
            )}
            <Link
              href={`/matches/${slot.matchId}`}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Ver / Apostar →
            </Link>
          </div>

          {status === 'settled' && (
            <p className="text-xs text-emerald-700">Vencedor: {winnerName ?? '—'}</p>
          )}

          {match.data && match.data.bestOf > 1 && (
            <p className="text-xs text-slate-500">
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

          {canDeclare && match.data && (
            <div className="flex flex-wrap gap-2">
              {match.data.participants.map((participant) => (
                <Button
                  key={participant.id}
                  disabled={declaring}
                  onClick={() => onDeclare(slot.matchId!, participant.id)}
                >
                  {participant.displayName} venceu{match.data!.bestOf > 1 ? ' o game' : ''}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Aguardando confronto anterior.</p>
      )}
    </div>
  )
}
