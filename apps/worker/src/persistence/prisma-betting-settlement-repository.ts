import { BettingSettlementRepository, Bet, BetStatus, BetMarketType } from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { PrismaClient } from 'database'
import { applyBetToWallet } from '../settlement/apply-settlement'

/**
 * Persists a market settlement ATOMICALLY: for every bettor, loads the wallet,
 * applies each of their bets' money effect (via the pure applyBetToWallet), and
 * writes the bet updates + ledger entries + final wallet — all in one
 * `$transaction`. Wallet invariants stay in the Wallet entity. Works for any
 * market (a match or a tournament's champion).
 */
export class PrismaBettingSettlementRepository implements BettingSettlementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOpenBetsByMarket(marketId: string): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({ where: { marketId, status: 'open' } })
    return rows.map(
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
  }

  async applySettlement(bets: Bet[]): Promise<void> {
    const byBettor = new Map<string, Bet[]>()
    for (const bet of bets) {
      const list = byBettor.get(bet.bettorId) ?? []
      list.push(bet)
      byBettor.set(bet.bettorId, list)
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [bettorId, userBets] of byBettor) {
        const walletRow = await tx.wallet.findUnique({ where: { userId: bettorId } })
        if (!walletRow) continue // a bet always implies a held wallet; skip defensively

        const wallet = new Wallet({
          id: walletRow.id,
          userId: walletRow.userId,
          balance: walletRow.balance,
          held: walletRow.held,
        })

        for (const bet of userBets) {
          const line = applyBetToWallet(wallet, bet)
          await tx.bet.update({
            where: { id: bet.id.value },
            data: { status: bet.status, payout: bet.payout.cents, settledAt: bet.settledAt },
          })
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id.value,
              type: line.type,
              amount: line.amount,
              referenceId: line.referenceId,
            },
          })
        }

        await tx.wallet.update({
          where: { userId: bettorId },
          data: { balance: wallet.balance.cents, held: wallet.held.cents },
        })
      }
    })
  }
}
