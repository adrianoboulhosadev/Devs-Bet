import { ParticipantRepository, ParticipantQueryRepository, Participant, ParticipantDTO } from '../../src'

interface ParticipantRow {
  id: string
  name: string
  nickname: string | null
  imageUrl: string | null
}

export default class ParticipantRepositoryInMemory
  implements ParticipantRepository, ParticipantQueryRepository
{
  readonly participants: ParticipantRow[] = []

  async findById(id: string): Promise<Participant | null> {
    const row = this.participants.find((participant) => participant.id === id)
    return row
      ? new Participant({ id: row.id, name: row.name, nickname: row.nickname, imageUrl: row.imageUrl })
      : null
  }

  async create(participant: Participant): Promise<void> {
    this.participants.push({
      id: participant.id.value,
      name: participant.name,
      nickname: participant.nickname,
      imageUrl: participant.imageUrl,
    })
  }

  async update(participant: Participant): Promise<void> {
    const row = this.participants.find((current) => current.id === participant.id.value)
    if (!row) return
    row.name = participant.name
    row.nickname = participant.nickname
    row.imageUrl = participant.imageUrl
  }

  async delete(id: string): Promise<void> {
    const index = this.participants.findIndex((participant) => participant.id === id)
    if (index >= 0) this.participants.splice(index, 1)
  }

  async existsByName(name: string): Promise<boolean> {
    return this.participants.some((participant) => participant.name === name)
  }

  async listQuery(): Promise<ParticipantDTO[]> {
    return this.participants.map((row) => this.toDTO(row))
  }

  async findByIdsQuery(ids: string[]): Promise<ParticipantDTO[]> {
    return this.participants.filter((row) => ids.includes(row.id)).map((row) => this.toDTO(row))
  }

  private toDTO(row: ParticipantRow): ParticipantDTO {
    return { id: row.id, name: row.name, nickname: row.nickname, imageUrl: row.imageUrl }
  }
}
