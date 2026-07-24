import { DepositLimitPeriod } from './deposit-limit'

/** READ projection (CQRS) of a deposit limit — already resolves a due pending
 * increase inline (no domain logic needed on the read side). */
export interface DepositLimitDTO {
  period: DepositLimitPeriod
  amount: number
  pendingAmount: number | null
  effectiveAt: Date | null
}
