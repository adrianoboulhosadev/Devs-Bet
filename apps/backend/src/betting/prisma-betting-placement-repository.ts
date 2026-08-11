import { Injectable } from '@nestjs/common'
import {
  BettingPlacementRepository,
  ComboBettingPlacementRepository,
  BetCancellationRepository,
  StakeLimitRepository,
  Bet,
  BetMarketType,
  BetStatus,
  ComboBet,
  ComboLegResult,
  StakeLimit,
  OddsCalculator,
} from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { PrismaService } from '../db/prisma.service'
import { inMoneyTransaction } from '../shared/money-transaction'

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
  implements
    BettingPlacementRepository,
    ComboBettingPlacementRepository,
    BetCancellationRepository,
    StakeLimitRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async placeBet(bet: Bet): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
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

      await this.recordOddsSnapshot(tx, bet.marketId)
    })
  }

  async placeCombo(combo: ComboBet): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
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

  // Odds-history point: the market's pool just moved (a bet came in, or one was
  // cancelled), so record where every selection's implied odd stands right now.
  // Combo legs never reach here — they don't touch this pool.
  private async recordOddsSnapshot(
    tx: Parameters<Parameters<typeof inMoneyTransaction>[1]>[0],
    marketId: string,
  ): Promise<void> {
    const openBetRows = await tx.bet.findMany({ where: { marketId, status: 'open' } })
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
    const odds = OddsCalculator.calculate(marketId, openBets)
    await tx.oddsSnapshot.createMany({
      data: odds.entries.map((entry) => ({
        marketId,
        selectionId: entry.selectionId,
        pool: entry.pool,
        totalPool: odds.totalPool,
        impliedOdd: entry.impliedOdd,
      })),
    })
  }

  async findBetById(betId: string): Promise<Bet | null> {
    const row = await this.prisma.bet.findUnique({ where: { id: betId } })
    return row
      ? new Bet({
          id: row.id,
          marketType: row.marketType as BetMarketType,
          marketId: row.marketId,
          bettorId: row.bettorId,
          selectionId: row.selectionId,
          stake: row.stake,
          status: row.status as BetStatus,
          payout: row.payout,
          settledAt: row.settledAt,
        })
      : null
  }

  // Mirror image of placeBet: give the stake back, mark the bet refunded, write
  // the ledger line and re-snapshot the odds (the bet just left the pool).
  async cancelBet(bet: Bet): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      const walletRow = await tx.wallet.findUnique({ where: { userId: bet.bettorId } })
      if (walletRow) {
        const wallet = new Wallet({
          id: walletRow.id,
          userId: walletRow.userId,
          balance: walletRow.balance,
          held: walletRow.held,
        })
        wallet.release(bet.stake)
        await tx.wallet.update({
          where: { userId: bet.bettorId },
          data: { balance: wallet.balance.cents, held: wallet.held.cents },
        })
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id.value,
            type: 'refund',
            amount: bet.stake.cents,
            referenceId: bet.id.value,
          },
        })
      }

      await tx.bet.update({
        where: { id: bet.id.value },
        data: { status: bet.status, payout: bet.payout.cents, settledAt: bet.settledAt },
      })

      await this.recordOddsSnapshot(tx, bet.marketId)
    })
  }

  async findComboBetById(comboBetId: string): Promise<ComboBet | null> {
    const row = await this.prisma.comboBet.findUnique({
      where: { id: comboBetId },
      include: { legs: true },
    })
    return row
      ? new ComboBet({
          id: row.id,
          bettorId: row.bettorId,
          stake: row.stake,
          status: row.status as BetStatus,
          payout: row.payout,
          settledAt: row.settledAt,
          legs: row.legs.map((leg) => ({
            id: leg.id,
            comboBetId: leg.comboBetId,
            marketType: leg.marketType as BetMarketType,
            marketId: leg.marketId,
            selectionId: leg.selectionId,
            odd: leg.odd,
            result: leg.result as ComboLegResult,
          })),
        })
      : null
  }

  // A cancelled ticket never touched any pool, so there is no snapshot to redo.
  async cancelCombo(combo: ComboBet): Promise<void> {
    await inMoneyTransaction(this.prisma, async (tx) => {
      const walletRow = await tx.wallet.findUnique({ where: { userId: combo.bettorId } })
      if (walletRow) {
        const wallet = new Wallet({
          id: walletRow.id,
          userId: walletRow.userId,
          balance: walletRow.balance,
          held: walletRow.held,
        })
        wallet.release(combo.stake)
        await tx.wallet.update({
          where: { userId: combo.bettorId },
          data: { balance: wallet.balance.cents, held: wallet.held.cents },
        })
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id.value,
            type: 'refund',
            amount: combo.stake.cents,
            referenceId: combo.id.value,
          },
        })
      }

      await tx.comboBet.update({
        where: { id: combo.id.value },
        data: { status: combo.status, payout: combo.payout.cents, settledAt: combo.settledAt },
      })
      for (const leg of combo.legs) {
        await tx.comboLeg.update({ where: { id: leg.id.value }, data: { result: leg.result } })
      }
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
