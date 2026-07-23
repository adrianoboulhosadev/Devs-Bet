'use client'

import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useMatchDetail } from '../hooks/use-match-detail'

export function MatchDetail({ matchId }: { matchId: string }) {
  const {
    match,
    odds,
    book,
    loading,
    isAdmin,
    isOpen,
    error,
    betForm,
    onPlaceBet,
    placing,
    lock,
    settle,
    cancel,
  } = useMatchDetail(matchId)

  if (loading || !match) return <Loading />

  const poolOf = (participantId: string) =>
    odds?.entries.find((entry) => entry.participantId === participantId)
  const winnerName = match.participants.find((p) => p.id === match.winnerParticipantId)?.displayName

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{match.title}</h1>
          {match.gameType && <p className="text-sm text-slate-500">{match.gameType}</p>}
          <p className="text-sm text-slate-500">{formatDateTime(match.scheduledAt)}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {match.status === 'settled' && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Vencedor: <span className="font-medium">{winnerName ?? '—'}</span>
        </p>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-medium">Odds ao vivo</h2>
          <span className="text-sm text-slate-500">Pool total: {formatBRL(odds?.totalPool ?? 0)}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {match.participants.map((participant) => {
            const line = poolOf(participant.id)
            return (
              <li key={participant.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-medium">{participant.displayName}</span>
                <span className="text-sm text-slate-500">
                  {formatBRL(line?.pool ?? 0)} · odd {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {isOpen && (
        <form onSubmit={onPlaceBet} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Apostar</h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Participante</span>
            <select
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              {...betForm.register('participantId')}
            >
              <option value="">Selecione…</option>
              {match.participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName}
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

      {isAdmin && match.status !== 'settled' && match.status !== 'cancelled' && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-medium">Admin</h2>
          <div className="flex flex-wrap gap-2">
            {match.status === 'open' && <Button onClick={lock}>Travar apostas</Button>}
            {match.status === 'locked' &&
              match.participants.map((participant) => (
                <Button key={participant.id} onClick={() => settle(participant.id)}>
                  Vencedor: {participant.displayName}
                </Button>
              ))}
            <Button variant="danger" onClick={cancel}>
              Cancelar partida
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 font-medium">Apostas ({book.length})</h2>
        {book.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhuma aposta ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {book.map((bet) => {
              const on = match.participants.find((p) => p.id === bet.participantId)?.displayName
              return (
                <li key={bet.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    {formatBRL(bet.stake)} em <span className="font-medium">{on ?? '—'}</span>
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
    </div>
  )
}
