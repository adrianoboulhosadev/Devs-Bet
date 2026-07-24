/** Amounts are in CENTS (integer). The userId comes from the JWT, never the body. */
export interface DepositInput {
  amount: number
  // Relative path returned by POST /upload/receipts (e.g. "/uploads/receipts/x.png").
  receiptUrl: string
}

export interface WithdrawalInput {
  amount: number
}
