'use client'

import { useState } from 'react'
import { Loading } from '@/components/loading'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/button'
import { mediaUrl } from '@/lib/media'
import { formatDateTime } from '@/lib/date'
import { useTournamentDetail } from '../hooks/use-tournament-detail'
import { BracketSlotCard } from './bracket-slot-card'
import { GroupStage } from './group-stage'
import { OutrightCard } from './outright-card'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function TournamentDetail({ tournamentId }: { tournamentId: string }) {
  const {
    tournament,
    loading,
    isAdmin,
    pathOf,
    roundCount,
    roundLabel,
    championName,
    declareResult,
    declaring,
    cancel,
  } = useTournamentDetail(tournamentId)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  if (loading || !tournament) return <Loading />

  const rounds = Array.from({ length: roundCount }, (_, round) => round)
  const slotsOfRound = (round: number) =>
    tournament.bracket
      .filter((slot) => slot.round === round)
      .sort((first, second) => first.position - second.position)

  const canCancel = isAdmin && tournament.status === 'in_progress'
  // Outright market is open only before the tournament starts (backend enforces it).
  const outrightOpen =
    tournament.status === 'in_progress' &&
    new Date(tournament.scheduledAt).getTime() > Date.now()

  return (
    <div className="animate-scrIn space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight text-arcade-text">{tournament.title}</h1>
          <p className="font-arcade text-lg text-arcade-text-muted">{pathOf(tournament.categoryId)}</p>
          <p className="font-arcade text-lg text-arcade-text-muted">
            {tournament.size} participantes · {formatDateTime(tournament.scheduledAt)}
          </p>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.imageUrl && (
        <div className="max-h-64 w-full border-3 border-arcade-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(tournament.imageUrl)} alt={tournament.title} className="max-h-64 w-full object-cover" />
        </div>
      )}

      {tournament.status === 'finished' && (
        <p className="border-3 border-arcade-lime bg-arcade-surface px-4 py-3 font-arcade text-xl text-arcade-lime">
          Campeão: <span>{championName ?? '—'}</span>
        </p>
      )}

      <OutrightCard
        tournamentId={tournament.id}
        tournamentTitle={tournament.title}
        participants={tournament.participants}
        open={outrightOpen}
        championParticipantId={tournament.championParticipantId}
      />

      <GroupStage
        groups={tournament.groups}
        phase={tournament.phase}
        isAdmin={isAdmin}
        declaring={declaring}
        onDeclare={declareResult}
      />

      {tournament.phase === 'group' ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-4 py-3 font-arcade text-lg text-arcade-text-muted">
          O mata-mata começa assim que a fase de grupos terminar.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {rounds.map((round) => (
              <div key={round} className="flex w-56 shrink-0 flex-col gap-3">
                <h2 className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">
                  {roundLabel(round).toUpperCase()}
                  {tournament.bestOfByRound[round] > 1 && ` · MD${tournament.bestOfByRound[round]}`}
                </h2>
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
      )}

      {canCancel && (
        <div className="border-3 border-arcade-amber bg-arcade-surface p-5 shadow-pixel">
          <h2 className="mb-3 font-pixel text-xs tracking-wide text-arcade-amber">SALA DE CONTROLE</h2>
          <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
            Cancelar torneio
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancelar o torneio?"
        description="Todas as apostas abertas (por confronto e no campeão) são estornadas. Não dá pra desfazer."
        confirmLabel="Cancelar torneio"
        onConfirm={() => {
          cancel()
          setConfirmingCancel(false)
        }}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  )
}
