/** Formats an integer amount of CENTS as Brazilian Real (e.g. 1550 -> "R$ 15,50"). */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Parses a reais string/number into integer cents (e.g. "15,50" -> 1550). */
export function toCents(reais: string | number): number {
  const normalized = typeof reais === 'number' ? reais : Number(reais.replace(',', '.'))
  return Math.round((Number.isFinite(normalized) ? normalized : 0) * 100)
}

/**
 * Sanitizes free-typed text into a valid reais amount as the user types: keeps
 * digits and a single decimal separator (comma or dot, capped at 2 places),
 * dropping everything else — letters, signs, extra separators. This is what
 * keeps a money field from ever accepting scientific notation (e.g. "1e80"),
 * which a native `type="number"` input happily parses as a huge amount.
 */
export function sanitizeMoneyInput(raw: string): string {
  const kept = raw.replace(/[^0-9.,]/g, '')
  const separatorIndex = kept.search(/[.,]/)
  if (separatorIndex === -1) return kept

  const separator = kept[separatorIndex]
  const integerPart = kept.slice(0, separatorIndex).replace(/[.,]/g, '')
  const decimalPart = kept.slice(separatorIndex + 1).replace(/[.,]/g, '').slice(0, 2)
  return `${integerPart}${separator}${decimalPart}`
}
