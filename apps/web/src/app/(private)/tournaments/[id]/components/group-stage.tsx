'use client'

import type { GroupDTO } from '@tournament/adapters'
import { GroupMatchCard } from './group-match-card'

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Fase de grupos</h2>
        {phase === 'group' && (
          <span className="text-sm text-slate-500">Os 2 primeiros de cada grupo avançam</span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {groups.map((group) => (
            <div key={group.groupIndex} className="w-72 shrink-0 space-y-3">
              <h3 className="text-sm font-medium text-slate-500">Grupo {group.groupIndex + 1}</h3>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Jogador</th>
                      <th className="px-3 py-2 text-right">V</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.standings.map((standing) => (
                      <tr
                        key={standing.participant.id}
                        className={standing.rank <= 2 ? 'bg-emerald-50/60' : undefined}
                      >
                        <td className="px-3 py-2">
                          {standing.participant.displayName}
                          {standing.rank <= 2 && (
                            <span className="ml-1 text-xs text-emerald-600">✓</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{standing.wins}</td>
                        <td className="px-3 py-2 text-right">
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
