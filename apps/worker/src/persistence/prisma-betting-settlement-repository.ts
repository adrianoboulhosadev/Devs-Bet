import { BettingSettlementRepository, Bet, BetStatus } from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { PrismaClient } from 'database'
import { applyBetToWallet } from '../settlement/apply-settlement'

/**
 * Persists a match settlement ATOMICALLY: for every bettor, loads the wallet,
 * applies each of their bets' money effect (via the pure applyBetToWallet), and
 * writes the bet updates + ledger entries + final wallet — all in one
 * `$transaction`. Wallet invariants stay in the Wallet entity.
 */
export class PrismaBettingSettlementRepository implements BettingSettlementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOpenBetsByMatch(matchId: string): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({ where: { matchId, status: 'open' } })
    return rows.map(
      (row) =>
        new Bet({
          id: row.id,
          matchId: row.matchId,
          bettorId: row.bettorId,
          participantId: row.participantId,
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
