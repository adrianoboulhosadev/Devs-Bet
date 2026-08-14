import { Injectable } from '@nestjs/common'
import { MatchRepository, MatchQueryRepository, Match, MatchDTO, MatchStatus } from '@match/adapters'
import { PrismaService } from '../db/prisma.service'

type MatchRowWithParticipants = {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: string
  rakeBasisPoints: number
  bestOf: number
  allowsDraw: boolean
  winnerParticipantId: string | null
  scheduledAt: Date
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
  participants: {
    id: string
    participantId: string
    displayName: string
    nickname: string | null
    imageUrl: string | null
  }[]
  units: { unitNumber: number; winnerParticipantId: string | null; proofImageUrl: string | null }[]
}

const includeAggregate = {
  participants: true,
  units: { orderBy: { unitNumber: 'asc' as const } },
}

@Injectable()
export class PrismaMatchRepository implements MatchRepository, MatchQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private reconstitute(row: MatchRowWithParticipants): Match {
    return new Match({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as MatchStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
      allowsDraw: row.allowsDraw,
      winnerParticipantId: row.winnerParticipantId,
      scheduledAt: row.scheduledAt,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        matchId: row.id,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      })),
      units: row.units.map((unit) => ({
        matchId: row.id,
        unitNumber: unit.unitNumber,
        winnerParticipantId: unit.winnerParticipantId,
        proofImageUrl: unit.proofImageUrl,
      })),
    })
  }

  async findById(id: string): Promise<Match | null> {
    const row = await this.prisma.match.findUnique({ where: { id }, include: includeAggregate })
    return row ? this.reconstitute(row) : null
  }

  async create(match: Match): Promise<void> {
    await this.prisma.match.create({
      data: {
        id: match.id.value,
        creatorId: match.creatorId,
        title: match.title,
        categoryId: match.categoryId,
        imageUrl: match.imageUrl,
        scheduledAt: match.scheduledAt,
        status: match.status,
        rakeBasisPoints: match.rakeBasisPoints,
        bestOf: match.bestOf,
        allowsDraw: match.allowsDraw,
        winnerParticipantId: match.winnerParticipantId,
        participants: {
          create: match.participants.map((participant) => ({
            id: participant.id.value,
            participantId: participant.participantId,
            displayName: participant.displayName,
            nickname: participant.nickname,
            imageUrl: participant.imageUrl,
          })),
        },
      },
    })
  }

  async update(match: Match): Promise<void> {
    // Units only ever grow (recordUnitResult appends) — upsert each so a repeated
    // call (or reconstituted-then-resaved unit) stays idempotent.
    await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: match.id.value },
        data: {
          title: match.title,
          categoryId: match.categoryId,
          scheduledAt: match.scheduledAt,
          status: match.status,
          winnerParticipantId: match.winnerParticipantId,
          lockedAt: match.lockedAt,
          settledAt: match.settledAt,
        },
      }),
      ...match.units.map((unit) =>
        this.prisma.matchUnit.upsert({
          where: { matchId_unitNumber: { matchId: match.id.value, unitNumber: unit.unitNumber } },
          create: {
            matchId: match.id.value,
            unitNumber: unit.unitNumber,
            winnerParticipantId: unit.winnerParticipantId,
            proofImageUrl: unit.proofImageUrl,
          },
          update: { winnerParticipantId: unit.winnerParticipantId, proofImageUrl: unit.proofImageUrl },
        }),
      ),
    ])
  }

  async findByIdQuery(id: string): Promise<MatchDTO | null> {
    const row = await this.prisma.match.findUnique({ where: { id }, include: includeAggregate })
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<MatchDTO[]> {
    const rows = await this.prisma.match.findMany({
      include: includeAggregate,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: MatchRowWithParticipants): MatchDTO {
    return {
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as MatchStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
      allowsDraw: row.allowsDraw,
      winnerParticipantId: row.winnerParticipantId,
      scheduledAt: row.scheduledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      })),
      units: row.units.map((unit) => ({
        unitNumber: unit.unitNumber,
        winnerParticipantId: unit.winnerParticipantId,
        proofImageUrl: unit.proofImageUrl,
      })),
      createdAt: row.createdAt,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
    }
  }
}
