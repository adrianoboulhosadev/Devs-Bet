import { MatchRepository, MatchQueryRepository, Match, MatchDTO, MatchStatus } from '../../src'

interface ParticipantRow {
  id: string
  matchId: string
  participantId: string
  displayName: string
  nickname: string | null
  imageUrl: string | null
}

interface UnitRow {
  id: string
  matchId: string
  unitNumber: number
  winnerParticipantId: string | null
  proofImageUrl: string | null
}

interface MatchRow {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  scheduledAt: Date
  status: MatchStatus
  rakeBasisPoints: number
  bestOf: number
  allowsDraw: boolean
  winnerParticipantId: string | null
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
}

export default class MatchRepositoryInMemory implements MatchRepository, MatchQueryRepository {
  readonly matches: MatchRow[] = []
  readonly participants: ParticipantRow[] = []
  readonly units: UnitRow[] = []

  private reconstitute(row: MatchRow): Match {
    return new Match({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      scheduledAt: row.scheduledAt,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
      allowsDraw: row.allowsDraw,
      winnerParticipantId: row.winnerParticipantId,
      lockedAt: row.lockedAt,
      settledAt: row.settledAt,
      participants: this.participants
        .filter((participant) => participant.matchId === row.id)
        .map((participant) => ({
          id: participant.id,
          matchId: participant.matchId,
          participantId: participant.participantId,
          displayName: participant.displayName,
          nickname: participant.nickname,
          imageUrl: participant.imageUrl,
        })),
      units: this.unitsOf(row.id),
    })
  }

  private unitsOf(matchId: string) {
    return this.units
      .filter((unit) => unit.matchId === matchId)
      .sort((first, second) => first.unitNumber - second.unitNumber)
      .map((unit) => ({
        // Reconstituted, not new — mirrors the Prisma adapter.
        id: unit.id,
        matchId: unit.matchId,
        unitNumber: unit.unitNumber,
        winnerParticipantId: unit.winnerParticipantId,
        proofImageUrl: unit.proofImageUrl,
      }))
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
      categoryId: match.categoryId,
      imageUrl: match.imageUrl,
      scheduledAt: match.scheduledAt,
      status: match.status,
      rakeBasisPoints: match.rakeBasisPoints,
      bestOf: match.bestOf,
      allowsDraw: match.allowsDraw,
      winnerParticipantId: match.winnerParticipantId,
      createdAt: new Date(),
      lockedAt: match.lockedAt,
      settledAt: match.settledAt,
    })
    for (const participant of match.participants) {
      this.participants.push({
        id: participant.id.value,
        matchId: match.id.value,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      })
    }
  }

  async update(match: Match): Promise<void> {
    const row = this.matches.find((current) => current.id === match.id.value)
    if (row) {
      row.title = match.title
      row.categoryId = match.categoryId
      row.scheduledAt = match.scheduledAt
      row.status = match.status
      row.winnerParticipantId = match.winnerParticipantId
      row.lockedAt = match.lockedAt
      row.settledAt = match.settledAt
    }
    // Units only ever grow — replace this match's units with the current snapshot.
    const remaining = this.units.filter((unit) => unit.matchId !== match.id.value)
    this.units.splice(
      0,
      this.units.length,
      ...remaining,
      ...match.units.map((unit) => ({
        id: unit.id.value,
        matchId: match.id.value,
        unitNumber: unit.unitNumber,
        winnerParticipantId: unit.winnerParticipantId,
        proofImageUrl: unit.proofImageUrl,
      })),
    )
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
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOf: row.bestOf,
      allowsDraw: row.allowsDraw,
      winnerParticipantId: row.winnerParticipantId,
      scheduledAt: row.scheduledAt,
      participants: this.participants
        .filter((participant) => participant.matchId === row.id)
        .map((participant) => ({
          id: participant.id,
          participantId: participant.participantId,
          displayName: participant.displayName,
          nickname: participant.nickname,
          imageUrl: participant.imageUrl,
        })),
      units: this.unitsOf(row.id).map((unit) => ({
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
