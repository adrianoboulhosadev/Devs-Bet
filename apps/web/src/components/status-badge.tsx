const STYLES: Record<string, string> = {
  open: 'bg-arcade-lime',
  locked: 'bg-arcade-amber',
  settled: 'bg-arcade-text-muted',
  cancelled: 'bg-arcade-danger',
  in_progress: 'bg-arcade-magenta',
  finished: 'bg-arcade-text-muted',
  pending: 'bg-arcade-amber',
  confirmed: 'bg-arcade-lime',
  paid: 'bg-arcade-cyan',
  rejected: 'bg-arcade-danger',
  won: 'bg-arcade-lime',
  lost: 'bg-arcade-danger',
  refunded: 'bg-arcade-text-muted',
  void: 'bg-arcade-text-muted',
}

const LABELS: Record<string, string> = {
  open: 'Aberta',
  locked: 'Travada',
  settled: 'Encerrada',
  cancelled: 'Cancelada',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  won: 'Ganhou',
  lost: 'Perdeu',
  refunded: 'Estornada',
  void: 'Anulada',
}

/** Small colored pixel-font pill for a match/payment/bet status. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-1 font-pixel text-[8px] tracking-wide text-arcade-bg ${STYLES[status] ?? 'bg-arcade-text-muted'}`}
    >
      {(LABELS[status] ?? status).toUpperCase()}
    </span>
  )
}
