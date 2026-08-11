'use client'

import { useMemo, useRef, useState } from 'react'
import { formatDateTime } from '@/lib/date'
import { shapeOddsHistory, valueAt, type OddsHistorySeries } from '@/lib/odds-history'
import type { OddsSnapshotDTO } from '@betting/adapters'

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 260
const PADDING = { top: 12, right: 16, bottom: 28, left: 40 }
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom
const Y_TICKS = 4

function stepPath(series: OddsHistorySeries, scaleX: (t: number) => number, scaleY: (odd: number) => number) {
  const [first, ...rest] = series.points
  let d = `M ${scaleX(first.t)} ${scaleY(first.odd)}`
  for (const point of rest) {
    d += ` H ${scaleX(point.t)} V ${scaleY(point.odd)}`
  }
  d += ` H ${PADDING.left + PLOT_WIDTH}`
  return d
}

function formatTick(hour: number): string {
  return new Date(hour).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface OddsHistoryChartProps {
  snapshots: OddsSnapshotDTO[]
  selectionLabel: (selectionId: string) => string
}

/** Live-odds history as a step chart (odds only change at a bet, so the line
 * holds flat between points and jumps at each one) — one line per selection,
 * capped to the 8-slot categorical palette (keeping the most-backed
 * selections) so a big tournament outright doesn't turn into unreadable
 * spaghetti. Hover shows a crosshair + every series' value at that moment; a
 * table view is always one click away (accessibility — never gated behind
 * hover alone). */
export function OddsHistoryChart({ snapshots, selectionLabel }: OddsHistoryChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const data = useMemo(() => shapeOddsHistory(snapshots), [snapshots])

  if (!data) {
    return (
      <p className="font-arcade text-lg text-arcade-text-muted">
        Ainda não há histórico de odds — aguardando a primeira aposta.
      </p>
    )
  }

  const { series, minTime, maxTime, maxOdd, omittedCount } = data
  const timeSpan = maxTime - minTime || 1

  const scaleX = (t: number) => PADDING.left + ((t - minTime) / timeSpan) * PLOT_WIDTH
  const scaleY = (odd: number) => PADDING.top + PLOT_HEIGHT - ((odd - 1) / (maxOdd - 1 || 1)) * PLOT_HEIGHT

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, index) => 1 + ((maxOdd - 1) * index) / Y_TICKS)
  const allTimes = [...new Set(series.flatMap((entry) => entry.points.map((point) => point.t)))].sort(
    (a, b) => a - b,
  )

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH
    const ratio = Math.min(1, Math.max(0, (relativeX - PADDING.left) / PLOT_WIDTH))
    const targetT = minTime + ratio * timeSpan
    const nearest = allTimes.reduce((closest, t) => (Math.abs(t - targetT) < Math.abs(closest - targetT) ? t : closest), allTimes[0])
    setHoverT(nearest)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {series.map((entry) => {
            const current = entry.points.at(-1)!.odd
            return (
              <div key={entry.selectionId} className="flex items-center gap-1.5 font-arcade text-lg text-arcade-text-soft">
                <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>
                  {selectionLabel(entry.selectionId)} <span className="text-arcade-text-muted">·</span>{' '}
                  <span className="font-medium text-arcade-text">{current.toFixed(2)}x</span>
                </span>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((current) => !current)}
          className="shrink-0 font-arcade text-lg text-arcade-text-muted underline"
        >
          {showTable ? 'ver gráfico' : 'ver como tabela'}
        </button>
      </div>

      {omittedCount > 0 && (
        <p className="font-arcade text-base text-arcade-text-muted">
          Mostrando as {series.length} seleções mais apostadas ({omittedCount} de fora, pra não poluir o gráfico).
        </p>
      )}

      {showTable ? (
        <div className="overflow-x-auto border-3 border-arcade-border">
          <table className="w-full text-left font-arcade text-base">
            <thead className="bg-arcade-header text-arcade-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Horário</th>
                {series.map((entry) => (
                  <th key={entry.selectionId} className="px-3 py-2 font-medium">
                    {selectionLabel(entry.selectionId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-arcade-border-strong">
              {allTimes.map((t) => (
                <tr key={t}>
                  <td className="px-3 py-1.5 text-arcade-text-muted">{formatDateTime(new Date(t))}</td>
                  {series.map((entry) => {
                    const value = valueAt(entry, t)
                    return (
                      <td key={entry.selectionId} className="px-3 py-1.5 font-medium tabular-nums text-arcade-text">
                        {value !== undefined ? `${value.toFixed(2)}x` : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="w-full touch-none"
            onMouseMove={onMove}
            onMouseLeave={() => setHoverT(null)}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + PLOT_WIDTH}
                  y1={scaleY(tick)}
                  y2={scaleY(tick)}
                  stroke="#241640"
                  strokeWidth={1}
                />
                <text x={PADDING.left - 6} y={scaleY(tick)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#8b7bb8">
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}
            <line
              x1={PADDING.left}
              x2={PADDING.left}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="#34215c"
              strokeWidth={1}
            />
            <line
              x1={PADDING.left}
              x2={PADDING.left + PLOT_WIDTH}
              y1={PADDING.top + PLOT_HEIGHT}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="#34215c"
              strokeWidth={1}
            />
            <text x={PADDING.left} y={VIEW_HEIGHT - 6} fontSize={9} fill="#8b7bb8">
              {formatTick(minTime)}
            </text>
            <text x={PADDING.left + PLOT_WIDTH} y={VIEW_HEIGHT - 6} textAnchor="end" fontSize={9} fill="#8b7bb8">
              {formatTick(maxTime)}
            </text>

            {series.map((entry) => (
              <path
                key={entry.selectionId}
                d={stepPath(entry, scaleX, scaleY)}
                fill="none"
                stroke={entry.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {hoverT !== null && (
              <line
                x1={scaleX(hoverT)}
                x2={scaleX(hoverT)}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#8b7bb8"
                strokeWidth={1}
              />
            )}
          </svg>

          {hoverT !== null && (
            <div
              className="pointer-events-none absolute top-2 border-2 border-arcade-border bg-arcade-surface px-3 py-2 font-arcade text-base shadow-pixel-sm"
              style={{
                left: `${Math.min(85, Math.max(2, (scaleX(hoverT) / VIEW_WIDTH) * 100))}%`,
              }}
            >
              <p className="mb-1 text-arcade-text-muted">{formatDateTime(new Date(hoverT))}</p>
              <ul className="space-y-0.5">
                {series.map((entry) => {
                  const value = valueAt(entry, hoverT)
                  if (value === undefined) return null
                  return (
                    <li key={entry.selectionId} className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-medium text-arcade-text">{value.toFixed(2)}x</span>
                      <span className="text-arcade-text-muted">{selectionLabel(entry.selectionId)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
