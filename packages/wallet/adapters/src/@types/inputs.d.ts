/** Amounts are in CENTS (integer). The userId comes from the JWT, never the body. */
export interface DepositInput {
  amount: number
}

export interface WithdrawalInput {
  amount: number
}
