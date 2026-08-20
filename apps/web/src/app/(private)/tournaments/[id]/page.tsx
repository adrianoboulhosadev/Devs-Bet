'use client'

import { Loading } from '@/components/loading'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/button'
import { mediaUrl } from '@/lib/media'
import { formatDateTime } from '@/lib/date'
import { useTournamentDetail } from './hooks/use-tournament-detail'
import { useTournamentMatches } from './hooks/use-tournament-matches'
import { BracketTree } from './components/bracket-tree'
import { GroupStage } from './components/group-stage'
import { OpenConfrontations } from './components/open-confrontations'
import { OutrightCard } from './components/outright-card'
import { ConfirmDialog } from '@/components/confirm-dialog'

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournamentId = params.id
  const {
    tournament,
    loading,
    isAdmin,
    pathOf,
    roundCount,
    roundLabel,
    champion,
    championName,
    cancel,
    confirmingCancel,
    setConfirmingCancel,
  } = useTournamentDetail(tournamentId)
  // Uma busca só pras matches do torneio inteiro: a chave desenha o status de
  // cada confronto e a lista de baixo carrega os botões de apostar.
  const { matchOf, openConfrontations } = useTournamentMatches(tournament, roundLabel)

  if (loading || !tournament) return <Loading />

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
        // 3:2 — the tournament banner's crop preset — with the WIDTH capped
        // instead of the height, so the framing the admin chose is shown whole
        // at any screen size. See the note on the match hero.
        <div className="mx-auto aspect-[3/2] w-full max-w-2xl border-3 border-arcade-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(tournament.imageUrl)} alt={tournament.title} className="h-full w-full object-cover" />
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

      <GroupStage groups={tournament.groups} phase={tournament.phase} matchOf={matchOf} />

      {tournament.phase === 'group' ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-4 py-3 font-arcade text-lg text-arcade-text-muted">
          O mata-mata começa assim que a fase de grupos terminar.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">CHAVE</h2>
          <BracketTree
            slots={tournament.bracket}
            roundCount={roundCount}
            roundLabel={roundLabel}
            bestOfByRound={tournament.bestOfByRound}
            matchOf={matchOf}
            champion={champion}
          />
        </div>
      )}

      <OpenConfrontations confrontations={openConfrontations} />

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
