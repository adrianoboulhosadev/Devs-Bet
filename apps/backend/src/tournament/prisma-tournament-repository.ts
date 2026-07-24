import { Injectable } from '@nestjs/common'
import {
  TournamentRepository,
  TournamentQueryRepository,
  Tournament,
  TournamentDTO,
  TournamentStatus,
} from '@tournament/adapters'
import { PrismaService } from '../db/prisma.service'

type ParticipantRow = { id: string; userId: string | null; displayName: string }
type SlotRow = {
  id: string
  round: number
  position: number
  matchId: string | null
  playerAId: string | null
  playerBId: string | null
}
type TournamentRow = {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: string
  size: number
  rakeBasisPoints: number
  championParticipantId: string | null
  scheduledAt: Date
  createdAt: Date
  participants: ParticipantRow[]
  slots: SlotRow[]
}

@Injectable()
export class PrismaTournamentRepository
  implements TournamentRepository, TournamentQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private static readonly INCLUDE = {
    participants: true,
    slots: { orderBy: [{ round: 'asc' as const }, { position: 'asc' as const }] },
  }

  private reconstitute(row: TournamentRow): Tournament {
    return new Tournament({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as TournamentStatus,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      championParticipantId: row.championParticipantId,
      scheduledAt: row.scheduledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        tournamentId: row.id,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
      slots: row.slots.map((slot) => ({
        id: slot.id,
        tournamentId: row.id,
        round: slot.round,
        position: slot.position,
        matchId: slot.matchId,
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
      })),
    })
  }

  async findAggregate(id: string): Promise<Tournament | null> {
    const row = await this.prisma.tournament.findUnique({
      where: { id },
      include: PrismaTournamentRepository.INCLUDE,
    })
    return row ? this.reconstitute(row) : null
  }

  async create(tournament: Tournament): Promise<void> {
    await this.prisma.tournament.create({
      data: {
        id: tournament.id.value,
        creatorId: tournament.creatorId,
        title: tournament.title,
        categoryId: tournament.categoryId,
        imageUrl: tournament.imageUrl,
        status: tournament.status,
        size: tournament.size,
        rakeBasisPoints: tournament.rakeBasisPoints,
        championParticipantId: tournament.championParticipantId,
        scheduledAt: tournament.scheduledAt,
        participants: {
          create: tournament.participants.map((participant) => ({
            id: participant.id.value,
            userId: participant.userId,
            displayName: participant.displayName,
          })),
        },
        slots: {
          create: tournament.slots.map((slot) => ({
            id: slot.id.value,
            round: slot.round,
            position: slot.position,
            matchId: slot.matchId,
            playerAId: slot.playerAId,
            playerBId: slot.playerBId,
          })),
        },
      },
    })
  }

  async update(tournament: Tournament): Promise<void> {
    // Persist the mutable state atomically: the tournament (status/champion) and
    // each slot (players advanced + attached match). Participants are immutable.
    await this.prisma.$transaction([
      this.prisma.tournament.update({
        where: { id: tournament.id.value },
        data: {
          status: tournament.status,
          championParticipantId: tournament.championParticipantId,
        },
      }),
      ...tournament.slots.map((slot) =>
        this.prisma.tournamentSlot.update({
          where: { id: slot.id.value },
          data: {
            matchId: slot.matchId,
            playerAId: slot.playerAId,
            playerBId: slot.playerBId,
          },
        }),
      ),
    ])
  }

  async findByIdQuery(id: string): Promise<TournamentDTO | null> {
    const row = await this.prisma.tournament.findUnique({
      where: { id },
      include: PrismaTournamentRepository.INCLUDE,
    })
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<TournamentDTO[]> {
    const rows = await this.prisma.tournament.findMany({
      include: PrismaTournamentRepository.INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: TournamentRow): TournamentDTO {
    const nameOf = (participantId: string | null) => {
      if (!participantId) return null
      const participant = row.participants.find((current) => current.id === participantId)
      return participant
        ? { id: participant.id, userId: participant.userId, displayName: participant.displayName }
        : null
    }
    return {
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as TournamentStatus,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      championParticipantId: row.championParticipantId,
      scheduledAt: row.scheduledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
      bracket: row.slots.map((slot) => ({
        id: slot.id,
        round: slot.round,
        position: slot.position,
        matchId: slot.matchId,
        playerA: nameOf(slot.playerAId),
        playerB: nameOf(slot.playerBId),
      })),
      createdAt: row.createdAt,
    }
  }
}
