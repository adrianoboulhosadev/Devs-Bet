import { Injectable } from '@nestjs/common'
import { MatchRepository, MatchQueryRepository, Match, MatchDTO, MatchStatus } from '@match/adapters'
import { PrismaService } from '../db/prisma.service'

type MatchRowWithParticipants = {
  id: string
  creatorId: string
  title: string
  gameType: string | null
  status: string
  rakeBasisPoints: number
  winnerParticipantId: string | null
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
  participants: { id: string; userId: string | null; displayName: string }[]
}

@Injectable()
export class PrismaMatchRepository implements MatchRepository, MatchQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private reconstitute(row: MatchRowWithParticipants): Match {
    return new Match({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      gameType: row.gameType,
      status: row.status as MatchStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      winnerParticipantId: row.winnerParticipantId,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        matchId: row.id,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
    })
  }

  async findById(id: string): Promise<Match | null> {
    const row = await this.prisma.match.findUnique({ where: { id }, include: { participants: true } })
    return row ? this.reconstitute(row) : null
  }

  async create(match: Match): Promise<void> {
    await this.prisma.match.create({
      data: {
        id: match.id.value,
        creatorId: match.creatorId,
        title: match.title,
        gameType: match.gameType,
        status: match.status,
        rakeBasisPoints: match.rakeBasisPoints,
        winnerParticipantId: match.winnerParticipantId,
        participants: {
          create: match.participants.map((participant) => ({
            id: participant.id.value,
            userId: participant.userId,
            displayName: participant.displayName,
          })),
        },
      },
    })
  }

  async update(match: Match): Promise<void> {
    await this.prisma.match.update({
      where: { id: match.id.value },
      data: {
        status: match.status,
        winnerParticipantId: match.winnerParticipantId,
        lockedAt: match.lockedAt,
        settledAt: match.settledAt,
      },
    })
  }

  async findByIdQuery(id: string): Promise<MatchDTO | null> {
    const row = await this.prisma.match.findUnique({ where: { id }, include: { participants: true } })
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<MatchDTO[]> {
    const rows = await this.prisma.match.findMany({
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: MatchRowWithParticipants): MatchDTO {
    return {
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      gameType: row.gameType,
      status: row.status as MatchStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      winnerParticipantId: row.winnerParticipantId,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
      createdAt: row.createdAt,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
    }
  }
}
