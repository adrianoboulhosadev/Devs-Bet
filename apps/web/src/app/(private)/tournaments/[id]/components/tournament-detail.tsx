'use client'

import { Loading } from '@/components/loading'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/button'
import { mediaUrl } from '@/lib/media'
import { formatDateTime } from '@/lib/date'
import { useTournamentDetail } from '../hooks/use-tournament-detail'
import { BracketSlotCard } from './bracket-slot-card'

export function TournamentDetail({ tournamentId }: { tournamentId: string }) {
  const {
    tournament,
    loading,
    isAdmin,
    error,
    pathOf,
    roundCount,
    roundLabel,
    championName,
    declareResult,
    declaring,
    cancel,
  } = useTournamentDetail(tournamentId)

  if (loading || !tournament) return <Loading />

  const rounds = Array.from({ length: roundCount }, (_, round) => round)
  const slotsOfRound = (round: number) =>
    tournament.bracket
      .filter((slot) => slot.round === round)
      .sort((first, second) => first.position - second.position)

  const canCancel = isAdmin && tournament.status === 'in_progress'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tournament.title}</h1>
          <p className="text-sm text-slate-500">{pathOf(tournament.categoryId)}</p>
          <p className="text-sm text-slate-500">
            {tournament.size} participantes · {formatDateTime(tournament.scheduledAt)}
          </p>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(tournament.imageUrl)}
          alt={tournament.title}
          className="max-h-64 w-full rounded-lg object-cover"
        />
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {tournament.status === 'finished' && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Campeão: <span className="font-medium">{championName ?? '—'}</span>
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {rounds.map((round) => (
            <div key={round} className="flex w-56 shrink-0 flex-col gap-3">
              <h2 className="text-sm font-medium text-slate-500">{roundLabel(round)}</h2>
              {slotsOfRound(round).map((slot) => (
                <BracketSlotCard
                  key={slot.id}
                  slot={slot}
                  isAdmin={isAdmin}
                  declaring={declaring}
                  onDeclare={declareResult}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {canCancel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 font-medium">Admin</h2>
          <Button variant="danger" onClick={cancel}>
            Cancelar torneio
          </Button>
        </div>
      )}
    </div>
  )
}
