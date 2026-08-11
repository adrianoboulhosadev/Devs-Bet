// Same 8-color neon set as the odds-history chart (see lib/odds-history.ts) —
// a deterministic, presentation-only way to give each participant/tournament
// entrant a consistent color badge across dashboard/lobby/arena/tournaments,
// since the domain has no notion of a participant's "color".
const PALETTE = ['#22e6ff', '#ff3d81', '#b6ff3d', '#ffb020', '#c77dff', '#ff6b35', '#4ade80', '#f472b6']

export function colorForId(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
