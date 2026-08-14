import type { SelfExclusionPeriod } from '@wallet/adapters'

/** Once started none of these can be cancelled early — that is the whole point. */
export const SELF_EXCLUSION_PERIODS: { period: SelfExclusionPeriod; label: string }[] = [
  { period: '24h', label: '24 horas' },
  { period: '7d', label: '7 dias' },
  { period: '30d', label: '30 dias' },
  { period: 'permanent', label: 'Permanente' },
]
