/** Formats an integer amount of CENTS as Brazilian Real (e.g. 1550 -> "R$ 15,50"). */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Parses a reais string/number into integer cents (e.g. "15,50" -> 1550). */
export function toCents(reais: string | number): number {
  const normalized = typeof reais === 'number' ? reais : Number(reais.replace(',', '.'))
  return Math.round((Number.isFinite(normalized) ? normalized : 0) * 100)
}
