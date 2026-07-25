/** READ projection (CQRS) of the bettor's daily stake cap, already resolved
 * inline (no domain logic needed on the read side). */
export interface StakeLimitDTO {
  amount: number
  pendingAmount: number | null
  effectiveAt: Date | null
}
