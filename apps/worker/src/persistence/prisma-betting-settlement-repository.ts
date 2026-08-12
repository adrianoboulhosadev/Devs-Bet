import { BettingSettlementRepository, Bet, ComboBet, BetStatus, BetMarketType, ComboLegResult } from '@betting/adapters'
import { Wallet } from '@wallet/adapters'
import { NotificationInput } from '@notification/adapters'
import { PrismaClient } from 'database'
import { applyBetToWallet, applyComboToWallet } from '../settlement/apply-settlement'
import {
  notificationsFor,
  resolveMarketTitle,
  writeNotifications,
} from '../settlement/settlement-notifications'
import { pushLiveUpdates } from '../settlement/live-updates'
import { inMoneyTransaction } from './money-transaction'

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
    if (bets.length === 0) return // nothing to move, and no market to name

    const byBettor = new Map<string, Bet[]>()
    for (const bet of bets) {
      const list = byBettor.get(bet.bettorId) ?? []
      list.push(bet)
      byBettor.set(bet.bettorId, list)
    }

    // Collected inside the transaction, pinged AFTER it commits (see below).
    const notified: string[] = []

    await inMoneyTransaction(this.prisma, async (tx) => {
      // Every bet of a settlement belongs to the same market, so its name is
      // resolved once and reused by all the inbox lines below.
      const marketTitle = await resolveMarketTitle(tx, bets[0].marketType, bets[0].marketId)
      const notifications: NotificationInput[] = []

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

          // Straight from what the entity recorded when it transitioned.
          notifications.push(...notificationsFor(bet.pullDomainEvents(), marketTitle))
        }

        await tx.wallet.update({
          where: { userId: bettorId },
          data: { balance: wallet.balance.cents, held: wallet.held.cents },
        })
      }

      await writeNotifications(tx, notifications)
      // Reset per attempt: inMoneyTransaction RETRIES on a write conflict, and a
      // retry re-runs this whole callback — appending would double the list.
      notified.length = 0
      notified.push(...notifications.map((item) => item.userId))
    })

    // Only now that the rows are committed: a ping the client acted on before
    // the commit would make it re-read and find nothing.
    await pushLiveUpdates(notified)
  }

  async findComboBetsWithOpenLegByMarket(marketId: string): Promise<ComboBet[]> {
    const rows = await this.prisma.comboBet.findMany({
      where: { status: 'open', legs: { some: { marketId, result: 'pending' } } },
      include: { legs: true },
    })
    return rows.map(
      (row) =>
        new ComboBet({
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
        }),
    )
  }

  async applyComboSettlement(combos: ComboBet[]): Promise<void> {
    const byBettor = new Map<string, ComboBet[]>()
    for (const combo of combos) {
      const list = byBettor.get(combo.bettorId) ?? []
      list.push(combo)
      byBettor.set(combo.bettorId, list)
    }

    // Collected inside the transaction, pinged AFTER it commits (see below).
    const notified: string[] = []

    await inMoneyTransaction(this.prisma, async (tx) => {
      const notifications: NotificationInput[] = []

      for (const [bettorId, userCombos] of byBettor) {
        const walletRow = await tx.wallet.findUnique({ where: { userId: bettorId } })
        if (!walletRow) continue // a combo always implies a held wallet; skip defensively

        const wallet = new Wallet({
          id: walletRow.id,
          userId: walletRow.userId,
          balance: walletRow.balance,
          held: walletRow.held,
        })

        for (const combo of userCombos) {
          // Persist every leg's current result, even if the ticket itself is
          // still open, waiting on other legs.
          for (const leg of combo.legs) {
            await tx.comboLeg.update({ where: { id: leg.id.value }, data: { result: leg.result } })
          }

          const line = applyComboToWallet(wallet, combo)
          if (!line) continue // still open, no money movement this round

          // Only a ticket that REACHED a final status this round recorded an
          // event; a leg resolving under an otherwise-open ticket recorded
          // nothing, so nothing is said.
          notifications.push(...notificationsFor(combo.pullDomainEvents(), ''))

          await tx.comboBet.update({
            where: { id: combo.id.value },
            data: { status: combo.status, payout: combo.payout.cents, settledAt: combo.settledAt },
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

      await writeNotifications(tx, notifications)
      // Reset per attempt — see applySettlement.
      notified.length = 0
      notified.push(...notifications.map((item) => item.userId))
    })

    await pushLiveUpdates(notified)
  }
}
