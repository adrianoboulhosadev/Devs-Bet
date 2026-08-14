'use client'

import type { GroupDTO } from '@tournament/adapters'
import { GroupMatchCard } from '../group-match-card'

interface GroupStageProps {
  groups: GroupDTO[]
  phase: 'group' | 'knockout'
  isAdmin: boolean
  declaring: boolean
  onDeclare: (matchId: string, winnerParticipantId: string) => void
}

/**
 * Round-robin group stage of a > 32-participant tournament (see
 * GROUP_STAGE_THRESHOLD): each group's standings (rank, wins, unit diff —
 * top 2 qualify) plus its 6 matchups. Shown even after the group stage
 * completes (phase flips to 'knockout') so the qualification history stays
 * visible alongside the knockout bracket below.
 */
export function GroupStage({ groups, phase, isAdmin, declaring, onDeclare }: GroupStageProps) {
  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">FASE DE GRUPOS</h2>
        {phase === 'group' && (
          <span className="font-arcade text-lg text-arcade-text-muted">Os 2 primeiros de cada grupo avançam</span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {groups.map((group) => (
            <div key={group.groupIndex} className="w-72 shrink-0 space-y-3">
              <h3 className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">
                GRUPO {group.groupIndex + 1}
              </h3>

              <div className="overflow-hidden border-3 border-arcade-border bg-arcade-surface">
                <table className="w-full font-arcade text-lg">
                  <thead className="bg-arcade-header text-base text-arcade-text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Jogador</th>
                      <th className="px-3 py-2 text-right">V</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arcade-border-strong">
                    {group.standings.map((standing) => (
                      <tr key={standing.participant.id} className={standing.rank <= 2 ? 'bg-[#1d1233]' : undefined}>
                        <td className="px-3 py-2 text-arcade-text">
                          {standing.participant.displayName}
                          {standing.rank <= 2 && <span className="ml-1 text-arcade-lime">✓</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-arcade-text">{standing.wins}</td>
                        <td className="px-3 py-2 text-right text-arcade-text">
                          {standing.unitsWon - standing.unitsLost >= 0 ? '+' : ''}
                          {standing.unitsWon - standing.unitsLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                {group.matches.map((match) => (
                  <GroupMatchCard
                    key={match.id}
                    match={match}
                    isAdmin={isAdmin}
                    declaring={declaring}
                    onDeclare={onDeclare}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
