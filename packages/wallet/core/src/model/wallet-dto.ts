/**
 * READ projection (CQRS) of the wallet. Amounts in cents; `available` is derived
 * (balance − held) at read time so the front does not recompute it.
 */
export interface WalletDTO {
  userId: string
  balance: number
  held: number
  available: number
  currency: 'BRL'
}
