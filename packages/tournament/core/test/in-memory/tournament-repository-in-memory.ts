import {
  TournamentRepository,
  TournamentQueryRepository,
  Tournament,
  TournamentDTO,
  TournamentStatus,
} from '../../src'

interface ParticipantRow {
  id: string
  tournamentId: string
  userId: string | null
  displayName: string
}

interface SlotRow {
  id: string
  tournamentId: string
  round: number
  position: number
  matchId: string | null
  playerAId: string | null
  playerBId: string | null
}

interface TournamentRow {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  scheduledAt: Date
  status: TournamentStatus
  size: number
  rakeBasisPoints: number
  bestOf: number
  championParticipantId: string | null
  createdAt: Date
  participants: ParticipantRow[]
  slots: SlotRow[]
}

export default class TournamentRepositoryInMemory
  implements TournamentRepository, TournamentQueryRepository
{
  readonly tournaments: TournamentRow[] = []

  private serialize(tournament: Tournament): TournamentRow {
    const existing = this.tournaments.find((row) => row.id === tournament.id.value)
    return {
      id: tournament.id.value,
      creatorId: tournament.creatorId,
      title: tournament.title,
      categoryId: tournament.categoryId,
      imageUrl: tournament.imageUrl,
      scheduledAt: tournament.scheduledAt,
      status: tournament.status,
      size: tournament.size,
      rakeBasisPoints: tournament.rakeBasisPoints,
      bestOf: tournament.bestOf,
      championParticipantId: tournament.championParticipantId,
      createdAt: existing?.createdAt ?? tournament.scheduledAt,
      participants: tournament.participants.map((participant) => ({
        id: participant.id.value,
        tournamentId: tournament.id.value,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
      slots: tournament.slots.map((slot) => ({
        id: slot.id.value,
        tournamentId: tournament.id.value,
        round: slot.round,
        position: slot.position,
        matchId: slot.matchId,
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
      })),
    }
  }

  private reconstitute(row: TournamentRow): Tournament {
    return new Tournament({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      scheduledAt: row.scheduledAt,
      status: row.status,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
      championParticipantId: row.championParticipantId,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        tournamentId: participant.tournamentId,
        userId: participant.userId,
        displayName: participant.displayName,
      })),
      slots: row.slots.map((slot) => ({
        id: slot.id,
        tournamentId: slot.tournamentId,
        round: slot.round,
        position: slot.position,
        matchId: slot.matchId,
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
      })),
    })
  }

  async findAggregate(id: string): Promise<Tournament | null> {
    const row = this.tournaments.find((tournament) => tournament.id === id)
    return row ? this.reconstitute(row) : null
  }

  async create(tournament: Tournament): Promise<void> {
    this.tournaments.push(this.serialize(tournament))
  }

  async update(tournament: Tournament): Promise<void> {
    const index = this.tournaments.findIndex((row) => row.id === tournament.id.value)
    if (index >= 0) this.tournaments[index] = this.serialize(tournament)
  }

  async findByIdQuery(id: string): Promise<TournamentDTO | null> {
    const row = this.tournaments.find((tournament) => tournament.id === id)
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<TournamentDTO[]> {
    return [...this.tournaments]
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .map((row) => this.toDTO(row))
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
      status: row.status,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
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
