// One table for every status the app shows — match, tournament, payment, bet,
// combo leg and account approval all land in the same badge.

export const STATUS_STYLES: Record<string, string> = {
  open: 'bg-arcade-lime',
  locked: 'bg-arcade-amber',
  settled: 'bg-arcade-text-muted',
  cancelled: 'bg-arcade-danger',
  in_progress: 'bg-arcade-magenta',
  finished: 'bg-arcade-text-muted',
  pending: 'bg-arcade-amber',
  approved: 'bg-arcade-lime',
  confirmed: 'bg-arcade-lime',
  paid: 'bg-arcade-cyan',
  rejected: 'bg-arcade-danger',
  won: 'bg-arcade-lime',
  lost: 'bg-arcade-danger',
  refunded: 'bg-arcade-text-muted',
  void: 'bg-arcade-text-muted',
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  locked: 'Travada',
  settled: 'Encerrada',
  cancelled: 'Cancelada',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  pending: 'Pendente',
  approved: 'Aprovado',
  confirmed: 'Confirmado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  won: 'Ganhou',
  lost: 'Perdeu',
  refunded: 'Estornada',
  void: 'Anulada',
}
