import { SelfExclusionPeriod } from './self-exclusion'

/** READ projection (CQRS) of the user's current self-exclusion, if any active. */
export interface SelfExclusionDTO {
  period: SelfExclusionPeriod
  startedAt: Date
  until: Date | null
}
