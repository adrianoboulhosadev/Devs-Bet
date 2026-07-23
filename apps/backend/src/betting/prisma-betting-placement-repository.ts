import { Injectable } from '@nestjs/common'
import { BettingPlacementRepository, Bet } from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { PrismaService } from '../db/prisma.service'

/**
 * Places a bet ATOMICALLY (cross-context): in a single `$transaction` it reserves
 * the stake on the bettor's wallet (Wallet.hold — raises INSUFFICIENT_BALANCE and
 * aborts the transaction if funds are short), inserts the bet and writes the
 * `bet_hold` ledger entry.
 */
@Injectable()
export class PrismaBettingPlacementRepository implements BettingPlacementRepository {
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
          matchId: bet.matchId,
          bettorId: bet.bettorId,
          participantId: bet.participantId,
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
    })
  }
}
