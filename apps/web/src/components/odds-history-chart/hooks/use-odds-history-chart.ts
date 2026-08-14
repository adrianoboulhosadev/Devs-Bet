'use client'

import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { shapeOddsHistory } from '@/lib/odds-history'
import type { OddsSnapshotDTO } from '@betting/adapters'
import { PADDING, PLOT_WIDTH, VIEW_WIDTH } from '../data/chart-geometry'

/**
 * Shapes the snapshots into series and owns the two interactive bits: the
 * crosshair position and the chart/table toggle.
 */
export function useOddsHistoryChart(snapshots: OddsSnapshotDTO[]) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const data = useMemo(() => shapeOddsHistory(snapshots), [snapshots])

  // Every distinct moment an odd changed — the crosshair snaps to these, not to
  // the raw pixel under the cursor.
  const allTimes = data
    ? [...new Set(data.series.flatMap((entry) => entry.points.map((point) => point.t)))].sort(
        (first, second) => first - second,
      )
    : []

  return {
    svgRef,
    data,
    allTimes,
    hoverT,
    clearHover: () => setHoverT(null),
    showTable,
    toggleTable: () => setShowTable((current) => !current),
    onMove: (event: MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg || !data) return
      const timeSpan = data.maxTime - data.minTime || 1
      const rect = svg.getBoundingClientRect()
      const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH
      const ratio = Math.min(1, Math.max(0, (relativeX - PADDING.left) / PLOT_WIDTH))
      const targetT = data.minTime + ratio * timeSpan
      const nearest = allTimes.reduce(
        (closest, t) => (Math.abs(t - targetT) < Math.abs(closest - targetT) ? t : closest),
        allTimes[0],
      )
      setHoverT(nearest)
    },
  }
}
