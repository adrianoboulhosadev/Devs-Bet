import { Injectable } from '@nestjs/common'
import { BetQueryRepository, Bet, BetDTO, BetStatus, BetMarketType } from '@betting/adapters'
import { PrismaService } from '../db/prisma.service'

type BetRow = {
  id: string
  marketType: string
  marketId: string
  bettorId: string
  selectionId: string
  stake: number
  status: string
  payout: number
  createdAt: Date
  settledAt: Date | null
}

@Injectable()
export class PrismaBetQueryRepository implements BetQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByMarketQuery(marketId: string): Promise<BetDTO[]> {
    const rows = await this.prisma.bet.findMany({ where: { marketId }, orderBy: { createdAt: 'desc' } })
    return rows.map((row) => this.toDTO(row))
  }

  async listByBettorQuery(bettorId: string): Promise<BetDTO[]> {
    const rows = await this.prisma.bet.findMany({ where: { bettorId }, orderBy: { createdAt: 'desc' } })
    return rows.map((row) => this.toDTO(row))
  }

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

  private toDTO(row: BetRow): BetDTO {
    return {
      id: row.id,
      marketType: row.marketType as BetMarketType,
      marketId: row.marketId,
      bettorId: row.bettorId,
      selectionId: row.selectionId,
      stake: row.stake,
      status: row.status as BetStatus,
      payout: row.payout,
      createdAt: row.createdAt,
      settledAt: row.settledAt,
    }
  }
}
