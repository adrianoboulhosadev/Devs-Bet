import { Injectable } from '@nestjs/common'
import {
  WalletRepository,
  WalletQueryRepository,
  PaymentQueryRepository,
  DepositLimitQueryRepository,
  Wallet,
  LedgerEntry,
  Payment,
  DepositLimit,
  DepositLimitPeriod,
  DepositLimitDTO,
  SelfExclusion,
  SelfExclusionPeriod,
  SelfExclusionDTO,
  WalletDTO,
  PaymentDTO,
  PaymentDirection,
  PaymentStatus,
} from '@wallet/adapters'
import { PrismaService } from '../db/prisma.service'
import { inMoneyTransaction } from '../shared/money-transaction'

@Injectable()
export class PrismaWalletRepository
  implements WalletRepository, WalletQueryRepository, PaymentQueryRepository, DepositLimitQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private reconstituteWallet(row: {
    id: string
    userId: string
    balance: number
    held: number
  }): Wallet {
    return new Wallet({ id: row.id, userId: row.userId, balance: row.balance, held: row.held })
  }

  private reconstitutePayment(row: {
    id: string
    userId: string
    direction: string
    amount: number
    status: string
    referenceCode: string
    receiptUrl: string | null
    confirmedBy: string | null
    confirmedAt: Date | null
  }): Payment {
    return new Payment({
      id: row.id,
      userId: row.userId,
      direction: row.direction as PaymentDirection,
      amount: row.amount,
      status: row.status as PaymentStatus,
      referenceCode: row.referenceCode,
      receiptUrl: row.receiptUrl,
      confirmedBy: row.confirmedBy,
      confirmedAt: row.confirmedAt,
    })
  }

  // Prisma upsert of the wallet by its (unique) userId. Runs inside the caller's
  // transaction client so the whole money move commits atomically.
  private walletUpsert(wallet: Wallet) {
    return {
      where: { userId: wallet.userId },
      create: {
        id: wallet.id.value,
        userId: wallet.userId,
        balance: wallet.balance.cents,
        held: wallet.held.cents,
      },
      update: { balance: wallet.balance.cents, held: wallet.held.cents },
    }
  }

  private ledgerData(entry: LedgerEntry) {
    return {
      id: entry.id.value,
      walletId: entry.walletId,
      type: entry.type,
      amount: entry.amount.cents,
      referenceId: entry.referenceId,
    }
  }

  private paymentUpdate(payment: Payment) {
    return {
      where: { id: payment.id.value },
      data: {
        status: payment.status,
        confirmedBy: payment.confirmedBy,
        confirmedAt: payment.confirmedAt,
      },
    }
  }

  async findWalletByUserId(userId: string): Promise<Wallet | null> {
    const row = await this.prisma.wallet.findUnique({ where: { userId } })
    return row ? this.reconstituteWallet(row) : null
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } })
    return row ? this.reconstitutePayment(row) : null
  }

  async saveDepositRequest(payment: Payment): Promise<void> {
    await this.prisma.payment.create({
      data: {
        id: payment.id.value,
        userId: payment.userId,
        direction: payment.direction,
        amount: payment.amount.cents,
        status: payment.status,
        referenceCode: payment.referenceCode,
        receiptUrl: payment.receiptUrl,
      },
    })
  }

  // Loads the bettor's wallet INSIDE the given transaction (provisioning an
  // empty one when the user never had it), so the domain method that follows
  // decides on a balance nobody else can be writing at the same time.
  private async loadWalletForUpdate(
    tx: Parameters<Parameters<typeof inMoneyTransaction>[1]>[0],
    userId: string,
  ): Promise<Wallet> {
    const row = await tx.wallet.findUnique({ where: { userId } })
    return row ? this.reconstituteWallet(row) : new Wallet({ userId })
  }

  private ledgerFor(wallet: Wallet, payment: Payment, type: 'deposit' | 'withdrawal'): LedgerEntry {
    return new LedgerEntry({
      walletId: wallet.id.value,
      type,
      amount: payment.amount.cents,
      referenceId: payment.id.value,
    })
  }

  async holdForWithdrawal(payment: Payment): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      const wallet = await this.loadWalletForUpdate(tx, payment.userId)
      wallet.hold(payment.amount) // raises INSUFFICIENT_BALANCE, aborting the transaction

      await tx.wallet.upsert(this.walletUpsert(wallet))
      await tx.payment.create({
        data: {
          id: payment.id.value,
          userId: payment.userId,
          direction: payment.direction,
          amount: payment.amount.cents,
          status: payment.status,
          referenceCode: payment.referenceCode,
          receiptUrl: payment.receiptUrl,
        },
      })
    })
  }

  async applyDepositConfirmation(payment: Payment): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      const wallet = await this.loadWalletForUpdate(tx, payment.userId)
      wallet.deposit(payment.amount)

      await tx.wallet.upsert(this.walletUpsert(wallet))
      await tx.ledgerEntry.create({ data: this.ledgerData(this.ledgerFor(wallet, payment, 'deposit')) })
      await tx.payment.update(this.paymentUpdate(payment))
    })
  }

  async applyWithdrawalConfirmation(payment: Payment): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      const wallet = await this.loadWalletForUpdate(tx, payment.userId)
      wallet.settleHold(payment.amount)

      await tx.wallet.upsert(this.walletUpsert(wallet))
      await tx.ledgerEntry.create({ data: this.ledgerData(this.ledgerFor(wallet, payment, 'withdrawal')) })
      await tx.payment.update(this.paymentUpdate(payment))
    })
  }

  async applyPaymentRejection(payment: Payment): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      // Only a withdrawal was holding funds; a rejected deposit never credited.
      if (payment.direction === 'withdrawal') {
        const wallet = await this.loadWalletForUpdate(tx, payment.userId)
        wallet.release(payment.amount)
        await tx.wallet.upsert(this.walletUpsert(wallet))
      }
      await tx.payment.update(this.paymentUpdate(payment))
    })
  }

  private reconstituteDepositLimit(row: {
    id: string
    userId: string
    period: string
    amount: number
    pendingAmount: number | null
    effectiveAt: Date | null
  }): DepositLimit {
    return new DepositLimit({
      id: row.id,
      userId: row.userId,
      period: row.period as DepositLimitPeriod,
      amount: row.amount,
      pendingAmount: row.pendingAmount,
      effectiveAt: row.effectiveAt,
    })
  }

  async findDepositLimits(userId: string): Promise<DepositLimit[]> {
    const rows = await this.prisma.depositLimit.findMany({ where: { userId } })
    return rows.map((row) => this.reconstituteDepositLimit(row))
  }

  async findDepositLimit(userId: string, period: DepositLimitPeriod): Promise<DepositLimit | null> {
    const row = await this.prisma.depositLimit.findUnique({ where: { userId_period: { userId, period } } })
    return row ? this.reconstituteDepositLimit(row) : null
  }

  async saveDepositLimit(limit: DepositLimit): Promise<void> {
    await this.prisma.depositLimit.upsert({
      where: { userId_period: { userId: limit.userId, period: limit.period } },
      create: {
        id: limit.id.value,
        userId: limit.userId,
        period: limit.period,
        amount: limit.amount,
        pendingAmount: limit.pendingAmount,
        effectiveAt: limit.effectiveAt,
      },
      update: {
        amount: limit.amount,
        pendingAmount: limit.pendingAmount,
        effectiveAt: limit.effectiveAt,
      },
    })
  }

  async sumDepositsSince(userId: string, since: Date): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { userId, direction: 'deposit', status: { not: 'rejected' }, createdAt: { gte: since } },
      _sum: { amount: true },
    })
    return result._sum.amount ?? 0
  }

  async listDepositLimitsByUserQuery(userId: string): Promise<DepositLimitDTO[]> {
    const rows = await this.prisma.depositLimit.findMany({ where: { userId } })
    const now = Date.now()
    return rows.map((row) => {
      // Read-side resolves a due pending increase inline — no domain logic
      // needed here, same numbers DepositLimit.effectiveAmount() would produce.
      const due = row.pendingAmount !== null && row.effectiveAt !== null && row.effectiveAt.getTime() <= now
      return {
        period: row.period as DepositLimitPeriod,
        amount: due ? row.pendingAmount! : row.amount,
        pendingAmount: due ? null : row.pendingAmount,
        effectiveAt: due ? null : row.effectiveAt,
      }
    })
  }

  private reconstituteSelfExclusion(row: {
    id: string
    userId: string
    period: string
    startedAt: Date
    until: Date | null
  }): SelfExclusion {
    return new SelfExclusion({
      id: row.id,
      userId: row.userId,
      period: row.period as SelfExclusionPeriod,
      startedAt: row.startedAt,
      until: row.until,
    })
  }

  async findActiveSelfExclusion(userId: string): Promise<SelfExclusion | null> {
    const row = await this.prisma.selfExclusion.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    })
    if (!row) return null
    const exclusion = this.reconstituteSelfExclusion(row)
    return exclusion.isActive ? exclusion : null
  }

  async saveSelfExclusion(exclusion: SelfExclusion): Promise<void> {
    await this.prisma.selfExclusion.create({
      data: {
        id: exclusion.id.value,
        userId: exclusion.userId,
        period: exclusion.period,
        startedAt: exclusion.startedAt,
        until: exclusion.until,
      },
    })
  }

  async findActiveSelfExclusionQuery(userId: string): Promise<SelfExclusionDTO | null> {
    const row = await this.prisma.selfExclusion.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    })
    if (!row) return null
    const isActive = row.until === null || row.until.getTime() > Date.now()
    return isActive
      ? { period: row.period as SelfExclusionPeriod, startedAt: row.startedAt, until: row.until }
      : null
  }

  async findByUserIdQuery(userId: string): Promise<WalletDTO | null> {
    const row = await this.prisma.wallet.findUnique({ where: { userId } })
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
    const rows = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toPaymentDTO(row))
  }

  async listPendingQuery(): Promise<PaymentDTO[]> {
    const rows = await this.prisma.payment.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => this.toPaymentDTO(row))
  }

  private toPaymentDTO(row: {
    id: string
    userId: string
    direction: string
    amount: number
    status: string
    referenceCode: string
    receiptUrl: string | null
    createdAt: Date
    confirmedAt: Date | null
  }): PaymentDTO {
    return {
      id: row.id,
      userId: row.userId,
      direction: row.direction as PaymentDirection,
      amount: row.amount,
      status: row.status as PaymentStatus,
      referenceCode: row.referenceCode,
      receiptUrl: row.receiptUrl,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
    }
  }
}
