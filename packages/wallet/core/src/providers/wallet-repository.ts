import { Wallet, Payment, DepositLimit, SelfExclusion } from '../model'

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

  // The four money moves below take the PAYMENT, not an already-mutated Wallet:
  // the adapter loads the wallet INSIDE the same transaction, applies the Wallet
  // method named in each comment and persists — exactly like
  // BettingPlacementRepository.placeBet. Handing over a wallet read beforehand
  // would put the read outside the transaction, and two concurrent moves would
  // then both write from the same stale balance, silently dropping one of them.
  // The rules stay in the entity; only WHERE it is loaded changes.

  // A user opens a pending withdrawal: `wallet.hold` (raises INSUFFICIENT_BALANCE
  // when available < amount, and a user with no wallet has nothing available)
  // + record the payment. Atomic.
  holdForWithdrawal(payment: Payment): Promise<void>

  // Admin confirms a deposit: `wallet.deposit` + ledger + payment. The wallet is
  // provisioned here when the user never had one. Atomic.
  applyDepositConfirmation(payment: Payment): Promise<void>

  // Admin pays a withdrawal: `wallet.settleHold` (balance/held down) + ledger +
  // payment. Atomic.
  applyWithdrawalConfirmation(payment: Payment): Promise<void>

  // Admin rejects a payment: mark it rejected, and for a WITHDRAWAL also
  // `wallet.release` the funds it was holding (a rejected deposit never credited
  // anything). Atomic.
  applyPaymentRejection(payment: Payment): Promise<void>

  // Responsible-gambling deposit caps (self-service). Every limit the user has
  // ever set (one per period at most).
  findDepositLimits(userId: string): Promise<DepositLimit[]>
  findDepositLimit(userId: string, period: DepositLimit['period']): Promise<DepositLimit | null>
  saveDepositLimit(limit: DepositLimit): Promise<void>
  // Total already deposited (pending + confirmed, i.e. anything not rejected)
  // since `since` — used to enforce a limit's rolling window.
  sumDepositsSince(userId: string, since: Date): Promise<number>

  // Responsible gambling: the user's current self-exclusion, if any is still
  // in force (never mutated/cancelled — see the SelfExclusion model).
  findActiveSelfExclusion(userId: string): Promise<SelfExclusion | null>
  saveSelfExclusion(exclusion: SelfExclusion): Promise<void>
}
