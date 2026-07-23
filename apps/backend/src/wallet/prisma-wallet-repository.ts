import { Injectable } from '@nestjs/common'
import {
  WalletRepository,
  WalletQueryRepository,
  PaymentQueryRepository,
  Wallet,
  LedgerEntry,
  Payment,
  WalletDTO,
  PaymentDTO,
  PaymentDirection,
  PaymentStatus,
} from '@wallet/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaWalletRepository
  implements WalletRepository, WalletQueryRepository, PaymentQueryRepository
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
      },
    })
  }

  async saveWithdrawalRequest(wallet: Wallet, payment: Payment): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.wallet.upsert(this.walletUpsert(wallet)),
      this.prisma.payment.create({
        data: {
          id: payment.id.value,
          userId: payment.userId,
          direction: payment.direction,
          amount: payment.amount.cents,
          status: payment.status,
          referenceCode: payment.referenceCode,
        },
      }),
    ])
  }

  async confirmDeposit(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.wallet.upsert(this.walletUpsert(wallet)),
      this.prisma.ledgerEntry.create({ data: this.ledgerData(entry) }),
      this.prisma.payment.update(this.paymentUpdate(payment)),
    ])
  }

  async confirmWithdrawal(wallet: Wallet, entry: LedgerEntry, payment: Payment): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.wallet.upsert(this.walletUpsert(wallet)),
      this.prisma.ledgerEntry.create({ data: this.ledgerData(entry) }),
      this.prisma.payment.update(this.paymentUpdate(payment)),
    ])
  }

  async rejectPayment(payment: Payment, wallet: Wallet | null): Promise<void> {
    const operations = wallet
      ? [this.prisma.wallet.upsert(this.walletUpsert(wallet)), this.prisma.payment.update(this.paymentUpdate(payment))]
      : [this.prisma.payment.update(this.paymentUpdate(payment))]
    await this.prisma.$transaction(operations)
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
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
    }
  }
}
