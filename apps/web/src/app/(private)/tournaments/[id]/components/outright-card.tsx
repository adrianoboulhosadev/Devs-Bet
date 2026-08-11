'use client'

import type { TournamentParticipantDTO } from '@tournament/adapters'
import { formatBRL } from '@/lib/money'
import { OddsHistoryChart } from '@/components/odds-history-chart'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useBetSlip } from '@/contexts/bet-slip-context'
import { useOutright } from '../hooks/use-outright'

interface OutrightCardProps {
  tournamentId: string
  tournamentTitle: string
  participants: TournamentParticipantDTO[]
  open: boolean
  championParticipantId: string | null
}

/**
 * "Bet on the champion" (outright) card: live pool + implied odd per participant.
 * While the market is open (before the tournament starts) each row is a button
 * that drops the pick into the bet slip — there is no form here any more.
 * Harder to hit than a single match, so the underdog pays much more.
 */
export function OutrightCard({
  tournamentId,
  tournamentTitle,
  participants,
  open,
  championParticipantId,
}: OutrightCardProps) {
  const { odds, oddsHistory } = useOutright(tournamentId, open)
  const { isSelfExcluded } = useSelfExclusion()
  const { toggle, has } = useBetSlip()

  const poolOf = (participantId: string) =>
    odds?.entries.find((entry) => entry.selectionId === participantId)
  const participantLabel = (participantId: string) =>
    participants.find((participant) => participant.id === participantId)?.displayName ?? '—'

  const pickable = open && !isSelfExcluded

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
          const picked = has(tournamentId, participant.id)
          const name = (
            <span className="font-medium">
              {participant.displayName}
              {isChampion && <span className="ml-2 text-xs text-emerald-600">campeão</span>}
            </span>
          )
          const line_ = (
            <span className={`text-sm ${picked ? 'text-white' : 'text-slate-500'}`}>
              {formatBRL(line?.pool ?? 0)} · odd {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
            </span>
          )

          return (
            <li key={participant.id}>
              {pickable ? (
                <button
                  type="button"
                  aria-pressed={picked}
                  onClick={() =>
                    toggle({
                      marketType: 'tournament_outright',
                      marketId: tournamentId,
                      selectionId: participant.id,
                      marketLabel: `${tournamentTitle} (campeão)`,
                      selectionLabel: participant.displayName,
                    })
                  }
                  className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                    picked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                  }`}
                >
                  {name}
                  {line_}
                </button>
              ) : (
                <div className="flex items-center justify-between px-5 py-3">
                  {name}
                  {line_}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="border-t border-slate-100 p-5">
        <h3 className="mb-3 text-sm font-medium">Histórico de odds</h3>
        <OddsHistoryChart snapshots={oddsHistory} selectionLabel={participantLabel} />
      </div>

      <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
        {!open
          ? 'Apostas no campeão encerradas.'
          : isSelfExcluded
            ? 'Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.'
            : 'Toque em um participante para adicioná-lo ao bilhete.'}
      </p>
    </div>
  )
}
