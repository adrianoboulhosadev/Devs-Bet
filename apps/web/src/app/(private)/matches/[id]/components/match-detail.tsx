'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { colorForId, initialsOf } from '@/lib/participant-colors'
import { CategoryPicker } from '@/components/category-picker'
import { OddsHistoryChart } from '@/components/odds-history-chart'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useBetSlip } from '@/contexts/bet-slip-context'
import { useMatchDetail, MATCH_DRAW_SELECTION_ID } from '../hooks/use-match-detail'

export function MatchDetail({ matchId }: { matchId: string }) {
  const {
    match,
    odds,
    oddsHistory,
    book,
    loading,
    isAdmin,
    isOpen,
    marketClosed,
    lock,
    recordUnitResult,
    cancel,
    isEditing,
    startEdit,
    cancelEdit,
    editForm,
    onEditSubmit,
    saving,
    categories,
    pathOf,
  } = useMatchDetail(matchId)
  const { isSelfExcluded } = useSelfExclusion()
  const { toggle, has } = useBetSlip()
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  if (loading || !match) return <Loading />

  // Betting selections for a match: its participants plus the draw pseudo-selection
  // (only when this match allows a draw — e.g. never for a tournament confrontation).
  const selections = [
    ...match.participants.map((participant) => ({
      id: participant.id,
      label: participant.displayName,
      color: colorForId(participant.participantId),
    })),
    ...(match.allowsDraw ? [{ id: MATCH_DRAW_SELECTION_ID, label: 'Empate', color: '#8b7bb8' }] : []),
  ]
  const selectionLabel = (selectionId: string) =>
    selections.find((selection) => selection.id === selectionId)?.label ?? '—'
  const poolOf = (selectionId: string) => odds?.entries.find((entry) => entry.selectionId === selectionId)
  const winnerName = match.participants.find((p) => p.id === match.winnerParticipantId)?.displayName
  const totalPool = odds?.totalPool ?? 0

  // bestOf > 1: how many units each participant has already won, and the next
  // unit's number (1-based) — the admin declares one unit at a time.
  const unitWinsOf = (participantId: string) =>
    match.units.filter((unit) => unit.winnerParticipantId === participantId).length
  const nextUnitNumber = match.units.length + 1
  const [p1, p2] = match.participants

  return (
    <div className="animate-scrIn space-y-6">
      <div className="relative overflow-hidden border-3 border-arcade-border bg-gradient-to-br from-[#2a1150] to-arcade-header p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
            {pathOf(match.categoryId).toUpperCase()}
          </span>
          <StatusBadge status={match.status} />
        </div>

        {match.imageUrl && (
          <div className="mb-6 h-[clamp(140px,20vw,210px)] border-3 border-arcade-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(match.imageUrl)} alt={match.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-5">
          <div className="min-w-0 flex-1 basis-40 text-right">
            <p className="text-3xl leading-tight text-arcade-text">{p1?.displayName}</p>
            <p className="font-arcade text-lg text-arcade-text-muted">
              {unitWinsOf(p1?.id ?? '')} unidade{unitWinsOf(p1?.id ?? '') === 1 ? '' : 's'} vencida
              {unitWinsOf(p1?.id ?? '') === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="grid h-[86px] w-[86px] place-items-center font-pixel text-lg text-arcade-bg shadow-pixel"
              style={{ backgroundColor: p1 ? colorForId(p1.participantId) : '#8b7bb8' }}
            >
              {p1 && initialsOf(p1.displayName)}
            </span>
            <span className="font-pixel text-xl text-arcade-magenta [text-shadow:0_0_18px_rgba(255,61,129,.7)]">VS</span>
            <span
              className="grid h-[86px] w-[86px] place-items-center font-pixel text-lg text-arcade-bg shadow-pixel"
              style={{ backgroundColor: p2 ? colorForId(p2.participantId) : '#8b7bb8' }}
            >
              {p2 && initialsOf(p2.displayName)}
            </span>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-3xl leading-tight text-arcade-text">{p2?.displayName}</p>
            <p className="font-arcade text-lg text-arcade-text-muted">
              {unitWinsOf(p2?.id ?? '')} unidade{unitWinsOf(p2?.id ?? '') === 1 ? '' : 's'} vencida
              {unitWinsOf(p2?.id ?? '') === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-center">
          <span className="font-arcade text-xl text-arcade-text-soft">{match.title}</span>
          <span className="font-pixel text-sm text-arcade-amber">{formatDateTime(match.scheduledAt)}</span>
        </div>
      </div>

      {match.status === 'settled' && (
        <p className="border-3 border-arcade-lime bg-arcade-surface px-4 py-3 font-arcade text-xl text-arcade-lime">
          {match.winnerParticipantId === null ? (
            <span>Empate</span>
          ) : (
            <>
              Vencedor: <span>{winnerName ?? '—'}</span>
            </>
          )}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
            <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3.5">
              <span className="font-pixel text-[10px] tracking-widest text-arcade-lime">
                {marketClosed ? 'ODDS FINAIS' : 'ODDS AO VIVO'}
              </span>
              <span className="font-arcade text-lg text-arcade-text-muted">pool total {formatBRL(totalPool)}</span>
            </div>
            {selections.map((selection) => {
              const line = poolOf(selection.id)
              const pct = totalPool > 0 ? Math.round(((line?.pool ?? 0) / totalPool) * 100) : 0
              const picked = has(match.id, selection.id)
              const clickable = isOpen && !isSelfExcluded

              const content = (
                <span className="flex flex-wrap items-center gap-3.5">
                  <span
                    className="grid h-10 w-10 flex-none place-items-center font-pixel text-[10px] text-arcade-bg"
                    style={{ backgroundColor: selection.color }}
                  >
                    {initialsOf(selection.label)}
                  </span>
                  <span className="min-w-[120px] flex-1">
                    <span className="block text-2xl leading-tight text-arcade-text">{selection.label}</span>
                    <span className="mt-1.5 block h-2 bg-[#0b0714]">
                      <span className="block h-full transition-all" style={{ backgroundColor: selection.color, width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-3xl leading-none text-arcade-text">
                      {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
                    </span>
                    <span className="block font-arcade text-lg text-arcade-text-muted">{formatBRL(line?.pool ?? 0)}</span>
                  </span>
                </span>
              )

              return clickable ? (
                <button
                  key={selection.id}
                  type="button"
                  aria-pressed={picked}
                  onClick={() =>
                    toggle({
                      marketType: 'match',
                      marketId: match.id,
                      selectionId: selection.id,
                      marketLabel: match.title,
                      selectionLabel: selection.label,
                    })
                  }
                  className={`block w-full border-b border-arcade-border-strong px-4 py-4 text-left transition-colors hover:bg-[#1d1233] ${
                    picked ? 'bg-[#2a1150]' : ''
                  }`}
                >
                  {content}
                </button>
              ) : (
                <div key={selection.id} className="border-b border-arcade-border-strong px-4 py-4">
                  {content}
                </div>
              )
            })}
            <p className="px-4 py-3.5 font-arcade text-lg text-arcade-text-muted">
              {isSelfExcluded
                ? 'Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.'
                : isOpen
                  ? 'clica num resultado pra jogar no bilhete · odd parimutuel, muda conforme a galera aposta'
                  : 'mercado fechado — mostrando o pool final'}
            </p>
          </div>

          {match.bestOf > 1 && (
            <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel">
              <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3">
                <span className="font-pixel text-[10px] tracking-widest text-arcade-text">MELHOR DE {match.bestOf}</span>
                <span className="font-arcade text-lg text-arcade-text-muted">
                  placar {match.participants.map((participant) => unitWinsOf(participant.id)).join('-')}
                </span>
              </div>
              {match.units.length === 0 ? (
                <p className="px-4 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma unidade disputada ainda.</p>
              ) : (
                match.units.map((unit) => (
                  <div key={unit.unitNumber} className="flex items-center justify-between border-b border-arcade-border-strong px-4 py-3 font-arcade text-lg">
                    <span className="text-arcade-text-muted">Unidade {unit.unitNumber}</span>
                    <span className="text-arcade-text">{selectionLabel(unit.winnerParticipantId ?? '')}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel-lg">
            <h2 className="mb-4 font-pixel text-[10px] tracking-widest text-arcade-cyan">HISTÓRICO DAS ODDS</h2>
            <OddsHistoryChart snapshots={oddsHistory} selectionLabel={selectionLabel} />
          </div>

          <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel">
            <h2 className="border-b-3 border-arcade-border-strong px-4 py-3 font-pixel text-[10px] tracking-widest text-arcade-amber">
              QUEM JÁ ENTROU ({book.length})
            </h2>
            {book.length === 0 ? (
              <p className="px-4 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma aposta ainda.</p>
            ) : (
              book.map((bet) => {
                const on = selectionLabel(bet.selectionId)
                return (
                  <div key={bet.id} className="flex items-center gap-3 border-b border-arcade-border-strong px-4 py-3">
                    <span className="min-w-0 flex-1 font-arcade text-lg text-arcade-text-soft">
                      <span className="text-arcade-text-muted">{bet.bettorId.slice(0, 8)}</span> em{' '}
                      <span className="text-arcade-text">{on}</span>
                    </span>
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      <span className="text-xl text-arcade-lime">{formatBRL(bet.stake)}</span>
                      <StatusBadge status={bet.status} />
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {isAdmin && match.status !== 'settled' && match.status !== 'cancelled' && (
        <div className="space-y-4 border-3 border-arcade-amber bg-arcade-surface p-5 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-widest text-arcade-amber">SALA DE CONTROLE</h2>
          <div className="flex flex-wrap gap-2.5">
            {match.status === 'open' && (
              <Button variant="warning" onClick={lock}>
                Travar apostas
              </Button>
            )}
            {match.status === 'open' && !isEditing && (
              <Button variant="secondary" onClick={startEdit}>
                Editar
              </Button>
            )}
            {match.status === 'locked' && match.bestOf > 1 && (
              <span className="w-full font-arcade text-lg text-arcade-text-muted">
                Vencedor da unidade {nextUnitNumber}:
              </span>
            )}
            {match.status === 'locked' &&
              match.participants.map((participant) => (
                <Button key={participant.id} variant="warning" onClick={() => recordUnitResult(participant.id)}>
                  {match.bestOf > 1 ? participant.displayName : `Vencedor: ${participant.displayName}`}
                </Button>
              ))}
            {match.status === 'locked' && match.allowsDraw && (
              <Button variant="secondary" onClick={() => recordUnitResult(null)}>
                Empate
              </Button>
            )}
            <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancelar partida
            </Button>
          </div>

          {match.status === 'open' && isEditing && (
            <form onSubmit={onEditSubmit} className="space-y-3.5 border-3 border-arcade-border-strong bg-arcade-header p-4">
              <h3 className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">EDITAR PARTIDA</h3>
              <Field label="TÍTULO" required {...editForm.register('title')} />
              <div className="space-y-2">
                <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">CATEGORIA</span>
                <CategoryPicker
                  categories={categories}
                  value={editForm.watch('categoryId') || null}
                  onChange={(leafId) => editForm.setValue('categoryId', leafId ?? '')}
                />
              </div>
              <Field label="DATA E HORA" type="datetime-local" required {...editForm.register('scheduledAt')} />
              <div className="flex gap-2.5">
                <Button type="submit" variant="warning" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancelar edição
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancelar a partida?"
        description="Todas as apostas abertas são estornadas para as carteiras. Não dá pra desfazer."
        confirmLabel="Cancelar partida"
        onConfirm={() => {
          cancel()
          setConfirmingCancel(false)
        }}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  )
}
