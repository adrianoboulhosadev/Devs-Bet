'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { CategoryPicker } from '@/components/category-picker'
import { OddsHistoryChart } from '@/components/odds-history-chart'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
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
    betForm,
    onPlaceBet,
    placing,
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
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  if (loading || !match) return <Loading />

  // Betting selections for a match: its participants plus the draw pseudo-selection
  // (only when this match allows a draw — e.g. never for a tournament confrontation).
  const selections = [
    ...match.participants.map((participant) => ({ id: participant.id, label: participant.displayName })),
    ...(match.allowsDraw ? [{ id: MATCH_DRAW_SELECTION_ID, label: 'Empate' }] : []),
  ]
  const selectionLabel = (selectionId: string) =>
    selections.find((selection) => selection.id === selectionId)?.label ?? '—'
  const poolOf = (selectionId: string) =>
    odds?.entries.find((entry) => entry.selectionId === selectionId)
  const winnerName = match.participants.find((p) => p.id === match.winnerParticipantId)?.displayName

  // bestOf > 1: how many units each participant has already won, and the next
  // unit's number (1-based) — the admin declares one unit at a time.
  const unitWinsOf = (participantId: string) =>
    match.units.filter((unit) => unit.winnerParticipantId === participantId).length
  const nextUnitNumber = match.units.length + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{match.title}</h1>
          <p className="text-sm text-slate-500">{pathOf(match.categoryId)}</p>
          <p className="text-sm text-slate-500">{formatDateTime(match.scheduledAt)}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {match.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(match.imageUrl)}
          alt={match.title}
          className="max-h-64 w-full rounded-lg object-cover"
        />
      )}

      {match.status === 'settled' && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {match.winnerParticipantId === null ? (
            <span className="font-medium">Empate</span>
          ) : (
            <>
              Vencedor: <span className="font-medium">{winnerName ?? '—'}</span>
            </>
          )}
        </p>
      )}

      {match.bestOf > 1 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="font-medium">Melhor de {match.bestOf}</h2>
            <span className="text-sm text-slate-500">
              Placar: {match.participants.map((participant) => unitWinsOf(participant.id)).join('-')}
            </span>
          </div>
          {match.units.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Nenhuma unidade disputada ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {match.units.map((unit) => (
                <li key={unit.unitNumber} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>Unidade {unit.unitNumber}</span>
                  <span className="font-medium">{selectionLabel(unit.winnerParticipantId ?? '')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-medium">{marketClosed ? 'Odds finais' : 'Odds ao vivo'}</h2>
          <span className="text-sm text-slate-500">Pool total: {formatBRL(odds?.totalPool ?? 0)}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {selections.map((selection) => {
            const line = poolOf(selection.id)
            return (
              <li key={selection.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-medium">{selection.label}</span>
                <span className="text-sm text-slate-500">
                  {formatBRL(line?.pool ?? 0)} · odd {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Histórico de odds</h2>
        <OddsHistoryChart snapshots={oddsHistory} selectionLabel={selectionLabel} />
      </div>

      {isOpen && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Apostar</h2>
          {isSelfExcluded ? (
            <p className="text-sm text-slate-500">
              Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.
            </p>
          ) : (
            <form onSubmit={onPlaceBet} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Resultado</span>
                <select
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  {...betForm.register('participantId')}
                >
                  <option value="">Selecione…</option>
                  {selections.map((selection) => (
                    <option key={selection.id} value={selection.id}>
                      {selection.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Valor (R$)" type="number" step="0.01" min="0" required {...betForm.register('amount')} />
              <Button type="submit" disabled={placing}>
                {placing ? 'Apostando…' : 'Confirmar aposta'}
              </Button>
            </form>
          )}
        </div>
      )}

      {isAdmin && match.status !== 'settled' && match.status !== 'cancelled' && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-medium">Admin</h2>
          <div className="flex flex-wrap gap-2">
            {match.status === 'open' && <Button onClick={lock}>Travar apostas</Button>}
            {match.status === 'open' && !isEditing && (
              <Button variant="secondary" onClick={startEdit}>
                Editar
              </Button>
            )}
            {match.status === 'locked' && match.bestOf > 1 && (
              <span className="w-full text-sm text-slate-500">
                Vencedor da unidade {nextUnitNumber}:
              </span>
            )}
            {match.status === 'locked' &&
              match.participants.map((participant) => (
                <Button key={participant.id} onClick={() => recordUnitResult(participant.id)}>
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
            <form onSubmit={onEditSubmit} className="space-y-3 rounded-lg border border-amber-300 bg-white p-4">
              <h3 className="text-sm font-medium">Editar partida</h3>
              <Field label="Título" required {...editForm.register('title')} />
              <div className="space-y-1">
                <span className="text-sm font-medium">Categoria</span>
                <CategoryPicker
                  categories={categories}
                  value={editForm.watch('categoryId') || null}
                  onChange={(leafId) => editForm.setValue('categoryId', leafId ?? '')}
                />
              </div>
              <Field label="Data e hora" type="datetime-local" required {...editForm.register('scheduledAt')} />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
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

      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 font-medium">Apostas ({book.length})</h2>
        {book.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhuma aposta ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {book.map((bet) => {
              const on = selectionLabel(bet.selectionId)
              return (
                <li key={bet.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    {formatBRL(bet.stake)} em <span className="font-medium">{on}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {bet.status !== 'open' && <span>{formatBRL(bet.payout)}</span>}
                    <StatusBadge status={bet.status} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

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
