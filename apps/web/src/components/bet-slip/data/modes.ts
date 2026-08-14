/** The two tabs of the slip: one bet per pick, or all picks on a single ticket. */
export type SlipMode = 'simples' | 'multiplas'

export const MODES: Array<{ id: SlipMode; label: string }> = [
  { id: 'simples', label: 'Simples' },
  { id: 'multiplas', label: 'Múltiplas' },
]
