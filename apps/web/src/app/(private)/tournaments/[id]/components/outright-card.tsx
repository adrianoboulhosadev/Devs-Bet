'use client'

import type { TournamentParticipantDTO } from '@tournament/adapters'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { formatBRL } from '@/lib/money'
import { useOutright } from '../hooks/use-outright'

interface OutrightCardProps {
  tournamentId: string
  participants: TournamentParticipantDTO[]
  open: boolean
  championParticipantId: string | null
}

/**
 * "Bet on the champion" (outright) card: live pool + implied odd per participant
 * and, while the market is open (before the tournament starts), a form to back a
 * champion. Harder to hit than a single match, so the underdog pays much more.
 */
export function OutrightCard({
  tournamentId,
  participants,
  open,
  championParticipantId,
}: OutrightCardProps) {
  const { odds, form, onSubmit, placing, error } = useOutright(tournamentId, open)

  const poolOf = (participantId: string) =>
    odds?.entries.find((entry) => entry.selectionId === participantId)

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="font-medium">Apostar no campeão</h2>
        <span className="text-sm text-slate-500">Pool total: {formatBRL(odds?.totalPool ?? 0)}</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {participants.map((participant) => {
          const line = poolOf(participant.id)
          const isChampion = participant.id === championParticipantId
          return (
            <li key={participant.id} className="flex items-center justify-between px-5 py-3">
              <span className="font-medium">
                {participant.displayName}
                {isChampion && <span className="ml-2 text-xs text-emerald-600">campeão</span>}
              </span>
              <span className="text-sm text-slate-500">
                {formatBRL(line?.pool ?? 0)} · odd {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
              </span>
            </li>
          )
        })}
      </ul>

      {open ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-100 p-5">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Campeão</span>
            <select
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              {...form.register('selectionId')}
            >
              <option value="">Selecione…</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </label>
          <Field label="Valor (R$)" type="number" step="0.01" min="0" required {...form.register('amount')} />
          <Button type="submit" disabled={placing}>
            {placing ? 'Apostando…' : 'Apostar no campeão'}
          </Button>
        </form>
      ) : (
        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          Apostas no campeão encerradas.
        </p>
      )}
    </div>
  )
}
