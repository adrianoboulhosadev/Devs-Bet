import type { DepositLimitPeriod } from '@wallet/adapters'

/** Rolling windows, not calendar ones — see the wallet section in CLAUDE.md. */
export const DEPOSIT_LIMIT_PERIODS: { period: DepositLimitPeriod; label: string }[] = [
  { period: 'daily', label: 'Diário' },
  { period: 'weekly', label: 'Semanal' },
  { period: 'monthly', label: 'Mensal' },
]
