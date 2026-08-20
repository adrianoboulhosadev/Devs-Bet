import type { MatchStatus } from '@match/adapters'

/**
 * Num chaveamento o status do confronto é uma FAIXA DE COR no topo do cartão, não
 * um badge escrito: cabe em qualquer largura (o cartão tem ~84px no celular) e,
 * por ser sempre do mesmo tamanho, mantém todos os cartões com a MESMA altura —
 * que é o que faz as linhas que ligam a chave caírem no lugar certo.
 */
export const CONFRONTATION_BAR_BY_STATUS: Record<MatchStatus, string> = {
  open: 'bg-arcade-lime',
  locked: 'bg-arcade-amber',
  settled: 'bg-arcade-text-muted',
  cancelled: 'bg-arcade-danger',
}

/** Confronto ainda sem partida criada (aguardando a rodada anterior). */
export const CONFRONTATION_BAR_PENDING = 'bg-arcade-border-strong'

/** Legenda das cores, logo abaixo da chave — cor sem legenda não se lê. */
export const CONFRONTATION_LEGEND: { status: MatchStatus; label: string }[] = [
  { status: 'open', label: 'aberta' },
  { status: 'locked', label: 'travada' },
  { status: 'settled', label: 'encerrada' },
]
