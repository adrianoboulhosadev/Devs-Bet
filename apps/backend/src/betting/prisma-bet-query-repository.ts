import { Injectable } from '@nestjs/common'
import { BetQueryRepository, Bet, BetDTO, BetStatus } from '@betting/adapters'
import { PrismaService } from '../db/prisma.service'

type BetRow = {
  id: string
  matchId: string
  bettorId: string
  participantId: string
  stake: number
  status: string
  payout: number
  createdAt: Date
  settledAt: Date | null
}

@Injectable()
export class PrismaBetQueryRepository implements BetQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByMatchQuery(matchId: string): Promise<BetDTO[]> {
    const rows = await this.prisma.bet.findMany({ where: { matchId }, orderBy: { createdAt: 'desc' } })
    return rows.map((row) => this.toDTO(row))
  }

  async listByBettorQuery(bettorId: string): Promise<BetDTO[]> {
    const rows = await this.prisma.bet.findMany({ where: { bettorId }, orderBy: { createdAt: 'desc' } })
    return rows.map((row) => this.toDTO(row))
  }

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

  private toDTO(row: BetRow): BetDTO {
    return {
      id: row.id,
      matchId: row.matchId,
      bettorId: row.bettorId,
      participantId: row.participantId,
      stake: row.stake,
      status: row.status as BetStatus,
      payout: row.payout,
      createdAt: row.createdAt,
      settledAt: row.settledAt,
    }
  }
}
