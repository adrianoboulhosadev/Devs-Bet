import { STATUS_LABELS, STATUS_STYLES } from './data/status-styles'

/** Small colored pixel-font pill for a match/payment/bet status. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-1 font-pixel text-[8px] tracking-wide text-arcade-bg ${STATUS_STYLES[status] ?? 'bg-arcade-text-muted'}`}
    >
      {(STATUS_LABELS[status] ?? status).toUpperCase()}
    </span>
  )
}
