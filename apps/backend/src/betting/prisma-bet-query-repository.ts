import { Injectable } from '@nestjs/common'
import {
  BetQueryRepository,
  Bet,
  BetDTO,
  BetStatus,
  BetMarketType,
  ComboBetDTO,
  ComboLegResult,
} from '@betting/adapters'
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

type ComboLegRow = {
  marketType: string
  marketId: string
  selectionId: string
  odd: number
  result: string
}

type ComboBetRow = {
  id: string
  bettorId: string
  stake: number
  totalOdd: number
  status: string
  payout: number
  createdAt: Date
  settledAt: Date | null
  legs: ComboLegRow[]
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
    return rows.map((row) => this.toEntity(row))
  }

  async findSettledBets(): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({ where: { status: { not: 'open' } } })
    return rows.map((row) => this.toEntity(row))
  }

  async listComboBetsByBettorQuery(bettorId: string): Promise<ComboBetDTO[]> {
    const rows = await this.prisma.comboBet.findMany({
      where: { bettorId },
      include: { legs: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toComboDTO(row))
  }

  private toComboDTO(row: ComboBetRow): ComboBetDTO {
    return {
      id: row.id,
      bettorId: row.bettorId,
      legs: row.legs.map((leg) => ({
        marketType: leg.marketType as BetMarketType,
        marketId: leg.marketId,
        selectionId: leg.selectionId,
        odd: leg.odd,
        result: leg.result as ComboLegResult,
      })),
      stake: row.stake,
      totalOdd: row.totalOdd,
      status: row.status as BetStatus,
      payout: row.payout,
      createdAt: row.createdAt,
      settledAt: row.settledAt,
    }
  }

  private toEntity(row: BetRow): Bet {
    return new Bet({
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
