import { Wallet, LedgerEntry, Payment } from '../model'

/**
 * Wallet WRITE port (command side). Because money moves must be ATOMIC, the port
 * exposes COMPOSITE operations (wallet + ledger + payment in one call); the Prisma
 * adapter wraps each in a `$transaction`. The core does not know about Prisma —
 * atomicity is the adapter's responsibility.
 */
export interface WalletRepository {
  findWalletByUserId(userId: string): Promise<Wallet | null>
  findPaymentById(id: string): Promise<Payment | null>

  // A user opens a pending deposit (no balance change yet).
  saveDepositRequest(payment: Payment): Promise<void>

  // A user opens a pending withdrawal: reserve (hold) the funds + record the payment. Atomic.
  saveWithdrawalRequest(wallet: Wallet, payment: Payment): Promise<void>

  // Admin confirms a deposit: upsert the credited wallet + ledger + payment. Atomic.
  confirmDeposit(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void>

  // Admin pays a withdrawal: settle the hold (balance/held down) + ledger + payment. Atomic.
  confirmWithdrawal(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void>

  // Admin rejects a payment: mark it rejected (+ release the hold when it is a withdrawal). Atomic.
  rejectPayment(payment: Payment, wallet: Wallet | null): Promise<void>
}
