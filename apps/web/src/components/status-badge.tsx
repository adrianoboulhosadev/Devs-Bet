const STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  locked: 'bg-amber-100 text-amber-800',
  settled: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-200 text-slate-700',
}

const LABELS: Record<string, string> = {
  open: 'Aberta',
  locked: 'Travada',
  settled: 'Encerrada',
  cancelled: 'Cancelada',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  won: 'Ganhou',
  lost: 'Perdeu',
  refunded: 'Estornada',
}

/** Small colored pill for a match/payment/bet status. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
