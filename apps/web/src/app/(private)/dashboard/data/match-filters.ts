import type { MatchStatus } from '@match/adapters'

/** "Todas" plus the four match states, in the order they happen. */
export type MatchFilter = 'all' | MatchStatus

export const MATCH_FILTERS: Array<{ id: MatchFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Abertas' },
  { id: 'locked', label: 'Travadas' },
  { id: 'settled', label: 'Encerradas' },
  { id: 'cancelled', label: 'Canceladas' },
]
