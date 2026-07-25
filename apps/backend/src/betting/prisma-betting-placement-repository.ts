import { Injectable } from '@nestjs/common'
import {
  BettingPlacementRepository,
  ComboBettingPlacementRepository,
  StakeLimitRepository,
  Bet,
  BetMarketType,
  BetStatus,
  ComboBet,
  StakeLimit,
  OddsCalculator,
} from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { PrismaService } from '../db/prisma.service'

/**
 * Places a bet ATOMICALLY (cross-context): in a single `$transaction` it reserves
 * the stake on the bettor's wallet (Wallet.hold — raises INSUFFICIENT_BALANCE and
 * aborts the transaction if funds are short), inserts the bet and writes the
 * `bet_hold` ledger entry. Also places combo (parlay) tickets the same way,
 * inserting every leg alongside it. Also serves the daily StakeLimit port
 * (responsible gambling) both PlaceBet and PlaceComboBet enforce.
 */
@Injectable()
export class PrismaBettingPlacementRepository
  implements BettingPlacementRepository, ComboBettingPlacementRepository, StakeLimitRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async placeBet(bet: Bet): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const walletRow = await tx.wallet.findUnique({ where: { userId: bet.bettorId } })
      const wallet = walletRow
        ? new Wallet({
            id: walletRow.id,
            userId: walletRow.userId,
            balance: walletRow.balance,
            held: walletRow.held,
          })
        : new Wallet({ userId: bet.bettorId })

      wallet.hold(bet.stake)

      await tx.wallet.upsert({
        where: { userId: bet.bettorId },
        create: {
          id: wallet.id.value,
          userId: wallet.userId,
          balance: wallet.balance.cents,
          held: wallet.held.cents,
        },
        update: { balance: wallet.balance.cents, held: wallet.held.cents },
      })

      await tx.bet.create({
        data: {
          id: bet.id.value,
          marketType: bet.marketType,
          marketId: bet.marketId,
          bettorId: bet.bettorId,
          selectionId: bet.selectionId,
          stake: bet.stake.cents,
          status: bet.status,
          payout: bet.payout.cents,
        },
      })

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id.value,
          type: 'bet_hold',
          amount: bet.stake.cents,
          referenceId: bet.id.value,
        },
      })

      // Odds-history point: this bet just moved the market's pool, so record
      // where every selection's implied odd stands right now (combo legs never
      // reach here — they don't touch this pool).
      const openBetRows = await tx.bet.findMany({ where: { marketId: bet.marketId, status: 'open' } })
      const openBets = openBetRows.map(
        (row) =>
          new Bet({
            id: row.id,
            marketType: row.marketType as BetMarketType,
            marketId: row.marketId,
            bettorId: row.bettorId,
            selectionId: row.selectionId,
            stake: row.stake,
            status: row.status as BetStatus,
            payout: row.payout,
            settledAt: row.settledAt,
          }),
      )
      const odds = OddsCalculator.calculate(bet.marketId, openBets)
      await tx.oddsSnapshot.createMany({
        data: odds.entries.map((entry) => ({
          marketId: bet.marketId,
          selectionId: entry.selectionId,
          pool: entry.pool,
          totalPool: odds.totalPool,
          impliedOdd: entry.impliedOdd,
        })),
      })
    })
  }

  async placeCombo(combo: ComboBet): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const walletRow = await tx.wallet.findUnique({ where: { userId: combo.bettorId } })
      const wallet = walletRow
        ? new Wallet({
            id: walletRow.id,
            userId: walletRow.userId,
            balance: walletRow.balance,
            held: walletRow.held,
          })
        : new Wallet({ userId: combo.bettorId })

      wallet.hold(combo.stake)

      await tx.wallet.upsert({
        where: { userId: combo.bettorId },
        create: {
          id: wallet.id.value,
          userId: wallet.userId,
          balance: wallet.balance.cents,
          held: wallet.held.cents,
        },
        update: { balance: wallet.balance.cents, held: wallet.held.cents },
      })

      await tx.comboBet.create({
        data: {
          id: combo.id.value,
          bettorId: combo.bettorId,
          stake: combo.stake.cents,
          totalOdd: combo.totalOdd,
          status: combo.status,
          payout: combo.payout.cents,
          legs: {
            create: combo.legs.map((leg) => ({
              id: leg.id.value,
              marketType: leg.marketType,
              marketId: leg.marketId,
              selectionId: leg.selectionId,
              odd: leg.odd,
              result: leg.result,
            })),
          },
        },
      })

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id.value,
          type: 'bet_hold',
          amount: combo.stake.cents,
          referenceId: combo.id.value,
        },
      })
    })
  }

  async findStakeLimit(bettorId: string): Promise<StakeLimit | null> {
    const row = await this.prisma.stakeLimit.findUnique({ where: { bettorId } })
    return row
      ? new StakeLimit({
          id: row.id,
          bettorId: row.bettorId,
          amount: row.amount,
          pendingAmount: row.pendingAmount,
          effectiveAt: row.effectiveAt,
        })
      : null
  }

  async saveStakeLimit(limit: StakeLimit): Promise<void> {
    await this.prisma.stakeLimit.upsert({
      where: { bettorId: limit.bettorId },
      create: {
        id: limit.id.value,
        bettorId: limit.bettorId,
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

  async sumStakedSince(bettorId: string, since: Date): Promise<number> {
    const [bets, combos] = await Promise.all([
      this.prisma.bet.aggregate({
        where: { bettorId, createdAt: { gte: since } },
        _sum: { stake: true },
      }),
      this.prisma.comboBet.aggregate({
        where: { bettorId, createdAt: { gte: since } },
        _sum: { stake: true },
      }),
    ])
    return (bets._sum.stake ?? 0) + (combos._sum.stake ?? 0)
  }
}
