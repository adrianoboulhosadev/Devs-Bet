import { MatchRepository, MatchQueryRepository, Match, MatchDTO, MatchStatus } from '../../src'

interface ParticipantRow {
  id: string
  matchId: string
  userId: string | null
  displayName: string
}

interface MatchRow {
  id: string
  creatorId: string
  title: string
  gameType: string | null
  imageUrl: string | null
  scheduledAt: Date
  status: MatchStatus
  rakeBasisPoints: number
  winnerParticipantId: string | null
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
}

export default class MatchRepositoryInMemory implements MatchRepository, MatchQueryRepository {
  readonly matches: MatchRow[] = []
  readonly participants: ParticipantRow[] = []

  private reconstitute(row: MatchRow): Match {
    return new Match({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      gameType: row.gameType,
      imageUrl: row.imageUrl,
      scheduledAt: row.scheduledAt,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      winnerParticipantId: row.winnerParticipantId,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
      participants: this.participants
        .filter((participant) => participant.matchId === row.id)
        .map((participant) => ({
          id: participant.id,
          matchId: participant.matchId,
          userId: participant.userId,
          displayName: participant.displayName,
        })),
    })
  }

  async findById(id: string): Promise<Match | null> {
    const row = this.matches.find((match) => match.id === id)
    return row ? this.reconstitute(row) : null
  }

  async create(match: Match): Promise<void> {
    this.matches.push({
      id: match.id.value,
      creatorId: match.creatorId,
      title: match.title,
      gameType: match.gameType,
      imageUrl: match.imageUrl,
      scheduledAt: match.scheduledAt,
      status: match.status,
      rakeBasisPoints: match.rakeBasisPoints,
      winnerParticipantId: match.winnerParticipantId,
      createdAt: new Date(),
      lockedAt: match.lockedAt,
      settledAt: match.settledAt,
    })
    for (const participant of match.participants) {
      this.participants.push({
        id: participant.id.value,
        matchId: match.id.value,
        userId: participant.userId,
        displayName: participant.displayName,
      })
    }
  }

  async update(match: Match): Promise<void> {
    const row = this.matches.find((current) => current.id === match.id.value)
    if (row) {
      row.status = match.status
      row.winnerParticipantId = match.winnerParticipantId
      row.lockedAt = match.lockedAt
      row.settledAt = match.settledAt
    }
  }

  async findByIdQuery(id: string): Promise<MatchDTO | null> {
    const row = this.matches.find((match) => match.id === id)
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<MatchDTO[]> {
    return [...this.matches]
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .map((row) => this.toDTO(row))
  }

  private toDTO(row: MatchRow): MatchDTO {
    return {
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      gameType: row.gameType,
      imageUrl: row.imageUrl,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      winnerParticipantId: row.winnerParticipantId,
      scheduledAt: row.scheduledAt,
      participants: this.participants
        .filter((participant) => participant.matchId === row.id)
        .map((participant) => ({
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
