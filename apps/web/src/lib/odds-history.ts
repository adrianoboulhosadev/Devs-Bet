import type { OddsSnapshotDTO } from '@betting/adapters'

// Validated categorical palette (dataviz skill), light-surface steps only — the
// app has no dark theme yet. Fixed order; a selection always keeps its slot's
// meaning (color follows the entity, never its rank).
const PALETTE = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
]
export const ODDS_HISTORY_MAX_SERIES = PALETTE.length

export interface OddsHistoryPoint {
  t: number // epoch ms
  odd: number
  pool: number
}

export interface OddsHistorySeries {
  selectionId: string
  color: string
  points: OddsHistoryPoint[]
}

export interface OddsHistoryData {
  series: OddsHistorySeries[]
  minTime: number
  maxTime: number
  maxOdd: number
  // How many selections were left out because there are more than the
  // palette can render distinctly (e.g. a large tournament outright).
  omittedCount: number
}

/** Groups raw snapshots into one step-series per selection, caps to the
 * palette size (keeping the most-backed selections), and assigns each a
 * stable color by first appearance in time. Returns null with no data yet. */
export function shapeOddsHistory(snapshots: OddsSnapshotDTO[]): OddsHistoryData | null {
  if (snapshots.length === 0) return null

  const bySelection = new Map<string, OddsHistoryPoint[]>()
  const firstSeenAt = new Map<string, number>()

  for (const snapshot of snapshots) {
    const t = new Date(snapshot.recordedAt).getTime()
    const points = bySelection.get(snapshot.selectionId) ?? []
    points.push({ t, odd: snapshot.impliedOdd, pool: snapshot.pool })
    bySelection.set(snapshot.selectionId, points)
    if (!firstSeenAt.has(snapshot.selectionId) || t < firstSeenAt.get(snapshot.selectionId)!) {
      firstSeenAt.set(snapshot.selectionId, t)
    }
  }
  for (const points of bySelection.values()) points.sort((a, b) => a.t - b.t)

  const byPoolDesc = [...bySelection.keys()].sort(
    (a, b) => bySelection.get(b)!.at(-1)!.pool - bySelection.get(a)!.at(-1)!.pool,
  )
  const omittedCount = Math.max(0, byPoolDesc.length - PALETTE.length)
  const keptIds = new Set(byPoolDesc.slice(0, PALETTE.length))

  // Color slot order: first appearance in time — stable regardless of pool size.
  const colorOrder = [...keptIds].sort((a, b) => firstSeenAt.get(a)! - firstSeenAt.get(b)!)
  const colorOf = new Map(colorOrder.map((id, index) => [id, PALETTE[index]]))

  const series: OddsHistorySeries[] = colorOrder.map((id) => ({
    selectionId: id,
    color: colorOf.get(id)!,
    points: bySelection.get(id)!,
  }))

  const allPoints = series.flatMap((entry) => entry.points)
  const minTime = Math.min(...allPoints.map((point) => point.t))
  const maxTime = Math.max(...allPoints.map((point) => point.t))
  const maxOdd = Math.max(2, ...allPoints.map((point) => point.odd))

  return { series, minTime, maxTime, maxOdd, omittedCount }
}

/** The step-function value of a series at time `t` (flat since its last point
 * at-or-before `t`; undefined before its first point). */
export function valueAt(series: OddsHistorySeries, t: number): number | undefined {
  let value: number | undefined
  for (const point of series.points) {
    if (point.t > t) break
    value = point.odd
  }
  return value
}
