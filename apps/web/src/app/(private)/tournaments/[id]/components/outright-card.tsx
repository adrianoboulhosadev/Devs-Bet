'use client'

import type { TournamentParticipantDTO } from '@tournament/adapters'
import { formatBRL } from '@/lib/money'
import { colorForId, initialsOf } from '@/lib/participant-colors'
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
    <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
      <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-5 py-3.5">
        <h2 className="font-pixel text-[10px] tracking-widest text-arcade-purple">APOSTAR NO CAMPEÃO</h2>
        <span className="font-arcade text-lg text-arcade-text-muted">pool total {formatBRL(odds?.totalPool ?? 0)}</span>
      </div>

      {participants.map((participant) => {
        const line = poolOf(participant.id)
        const isChampion = participant.id === championParticipantId
        const picked = has(tournamentId, participant.id)

        const content = (
          <span className="flex flex-wrap items-center gap-3.5">
            <span
              className="grid h-10 w-10 flex-none place-items-center font-pixel text-[10px] text-arcade-bg"
              style={{ backgroundColor: colorForId(participant.id) }}
            >
              {initialsOf(participant.displayName)}
            </span>
            <span className="min-w-[120px] flex-1 text-2xl leading-tight text-arcade-text">
              {participant.displayName}
              {isChampion && <span className="ml-2 font-pixel text-[9px] text-arcade-lime">CAMPEÃO</span>}
            </span>
            <span className="text-right">
              <span className="block text-2xl leading-none text-arcade-text">
                {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
              </span>
              <span className="block font-arcade text-lg text-arcade-text-muted">{formatBRL(line?.pool ?? 0)}</span>
            </span>
          </span>
        )

        return pickable ? (
          <button
            key={participant.id}
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
            className={`block w-full border-b border-arcade-border-strong px-5 py-3.5 text-left transition-colors hover:bg-[#1d1233] ${
              picked ? 'bg-[#2a1150]' : ''
            }`}
          >
            {content}
          </button>
        ) : (
          <div key={participant.id} className="border-b border-arcade-border-strong px-5 py-3.5">
            {content}
          </div>
        )
      })}

      <div className="p-5">
        <h3 className="mb-4 font-pixel text-[10px] tracking-widest text-arcade-cyan">HISTÓRICO DE ODDS</h3>
        <OddsHistoryChart snapshots={oddsHistory} selectionLabel={participantLabel} />
      </div>

      <p className="border-t-3 border-arcade-border-strong px-5 py-3.5 font-arcade text-lg text-arcade-text-muted">
        {!open
          ? 'Apostas no campeão encerradas.'
          : isSelfExcluded
            ? 'Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.'
            : 'Toque em um participante para adicioná-lo à sua aposta.'}
      </p>
    </div>
  )
}
