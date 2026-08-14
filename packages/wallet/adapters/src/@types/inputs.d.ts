import type { DepositLimitPeriod, SelfExclusionPeriod } from '@wallet/core'

/** Amounts are in CENTS (integer). The userId comes from the JWT, never the body. */
export interface DepositInput {
  amount: number
  // Relative path returned by POST /upload/receipts (e.g. "/uploads/receipts/x.png").
  receiptUrl: string
}

export interface WithdrawalInput {
  amount: number
}

/** Admin marking a withdrawal paid: the payout receipt is mandatory proof the
 * money actually left. Relative path returned by POST /upload/receipts. */
export interface ConfirmWithdrawalInput {
  receiptUrl: string
}

/** Admin rejecting a payment. Mandatory for a withdrawal (enforced by
 * Payment.reject), optional for a deposit. */
export interface RejectPaymentInput {
  reason?: string
}

/** Self-service deposit cap. userId comes from the JWT, never the body. */
export interface SetDepositLimitInput {
  period: DepositLimitPeriod
  amount: number // cents
}

/** Self-service self-exclusion. userId comes from the JWT, never the body. */
export interface StartSelfExclusionInput {
  period: SelfExclusionPeriod
}
