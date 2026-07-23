import {
  WalletRepository,
  WalletQueryRepository,
  PaymentQueryRepository,
  Wallet,
  LedgerEntry,
  Payment,
  WalletDTO,
  PaymentDTO,
  LedgerEntryType,
  PaymentDirection,
  PaymentStatus,
} from '../../src'

interface WalletRow {
  id: string
  userId: string
  balance: number
  held: number
}

interface PaymentRow {
  id: string
  userId: string
  direction: PaymentDirection
  amount: number
  status: PaymentStatus
  referenceCode: string
  createdAt: Date
  confirmedBy: string | null
  confirmedAt: Date | null
}

interface LedgerRow {
  id: string
  walletId: string
  type: LedgerEntryType
  amount: number
  referenceId: string | null
}

/**
 * Single in-memory store implementing the wallet WRITE port and both query ports,
 * so a test shares state across commands and reads. Composite methods mimic the
 * Prisma adapter's `$transaction` by mutating all rows together.
 */
export default class WalletRepositoryInMemory
  implements WalletRepository, WalletQueryRepository, PaymentQueryRepository
{
  readonly wallets: WalletRow[] = []
  readonly payments: PaymentRow[] = []
  readonly ledger: LedgerRow[] = []

  private upsertWallet(wallet: Wallet): void {
    const row = this.wallets.find((current) => current.userId === wallet.userId)
    if (row) {
      row.balance = wallet.balance.cents
      row.held = wallet.held.cents
    } else {
      this.wallets.push({
        id: wallet.id.value,
        userId: wallet.userId,
        balance: wallet.balance.cents,
        held: wallet.held.cents,
      })
    }
  }

  private insertPayment(payment: Payment): void {
    this.payments.push({
      id: payment.id.value,
      userId: payment.userId,
      direction: payment.direction,
      amount: payment.amount.cents,
      status: payment.status,
      referenceCode: payment.referenceCode,
      createdAt: new Date(),
      confirmedBy: payment.confirmedBy,
      confirmedAt: payment.confirmedAt,
    })
  }

  private updatePayment(payment: Payment): void {
    const row = this.payments.find((current) => current.id === payment.id.value)
    if (row) {
      row.status = payment.status
      row.confirmedBy = payment.confirmedBy
      row.confirmedAt = payment.confirmedAt
    }
  }

  private insertLedger(entry: LedgerEntry): void {
    this.ledger.push({
      id: entry.id.value,
      walletId: entry.walletId,
      type: entry.type,
      amount: entry.amount.cents,
      referenceId: entry.referenceId,
    })
  }

  async findWalletByUserId(userId: string): Promise<Wallet | null> {
    const row = this.wallets.find((current) => current.userId === userId)
    return row
      ? new Wallet({ id: row.id, userId: row.userId, balance: row.balance, held: row.held })
      : null
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    const row = this.payments.find((current) => current.id === id)
    return row
      ? new Payment({
          id: row.id,
          userId: row.userId,
          direction: row.direction,
          amount: row.amount,
          status: row.status,
          referenceCode: row.referenceCode,
          confirmedBy: row.confirmedBy,
          confirmedAt: row.confirmedAt,
        })
      : null
  }

  async saveDepositRequest(payment: Payment): Promise<void> {
    this.insertPayment(payment)
  }

  async saveWithdrawalRequest(wallet: Wallet, payment: Payment): Promise<void> {
    this.upsertWallet(wallet)
    this.insertPayment(payment)
  }

  async confirmDeposit(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void> {
    this.upsertWallet(wallet)
    this.insertLedger(entry)
    this.updatePayment(payment)
  }

  async confirmWithdrawal(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void> {
    this.upsertWallet(wallet)
    this.insertLedger(entry)
    this.updatePayment(payment)
  }

  async rejectPayment(payment: Payment, wallet: Wallet | null): Promise<void> {
    if (wallet) this.upsertWallet(wallet)
    this.updatePayment(payment)
  }

  async findByUserIdQuery(userId: string): Promise<WalletDTO | null> {
    const row = this.wallets.find((current) => current.userId === userId)
    return row
      ? {
          userId: row.userId,
          balance: row.balance,
          held: row.held,
          available: row.balance - row.held,
          currency: 'BRL',
        }
      : null
  }

  async listByUserQuery(userId: string): Promise<PaymentDTO[]> {
    return this.payments.filter((row) => row.userId === userId).map((row) => this.toPaymentDTO(row))
  }

  async listPendingQuery(): Promise<PaymentDTO[]> {
    return this.payments.filter((row) => row.status === 'pending').map((row) => this.toPaymentDTO(row))
  }

  private toPaymentDTO(row: PaymentRow): PaymentDTO {
    return {
      id: row.id,
      userId: row.userId,
      direction: row.direction,
      amount: row.amount,
      status: row.status,
      referenceCode: row.referenceCode,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
    }
  }
}
