import { Injectable } from '@nestjs/common'
import {
  ParticipantRepository,
  ParticipantQueryRepository,
  Participant,
  ParticipantDTO,
} from '@participant/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaParticipantRepository implements ParticipantRepository, ParticipantQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Participant | null> {
    const row = await this.prisma.participant.findUnique({ where: { id } })
    return row
      ? new Participant({ id: row.id, name: row.name, nickname: row.nickname, imageUrl: row.imageUrl })
      : null
  }

  async create(participant: Participant): Promise<void> {
    await this.prisma.participant.create({
      data: {
        id: participant.id.value,
        name: participant.name,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      },
    })
  }

  async update(participant: Participant): Promise<void> {
    await this.prisma.participant.update({
      where: { id: participant.id.value },
      data: {
        name: participant.name,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.participant.delete({ where: { id } })
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.prisma.participant.count({ where: { name } })
    return count > 0
  }

  async listQuery(): Promise<ParticipantDTO[]> {
    const rows = await this.prisma.participant.findMany({ orderBy: { name: 'asc' } })
    return rows.map((row) => this.toDTO(row))
  }

  async findByIdsQuery(ids: string[]): Promise<ParticipantDTO[]> {
    const rows = await this.prisma.participant.findMany({ where: { id: { in: ids } } })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: { id: string; name: string; nickname: string | null; imageUrl: string | null }): ParticipantDTO {
    return { id: row.id, name: row.name, nickname: row.nickname, imageUrl: row.imageUrl }
  }
}
