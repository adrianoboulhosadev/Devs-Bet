import {
  TournamentRepository,
  TournamentQueryRepository,
  Tournament,
  TournamentDTO,
  TournamentStatus,
  GroupStandingsCalculator,
} from '../../src'

interface ParticipantRow {
  id: string
  tournamentId: string
  participantId: string
  displayName: string
  nickname: string | null
  imageUrl: string | null
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

interface GroupMatchRow {
  id: string
  tournamentId: string
  groupIndex: number
  matchupIndex: number
  playerAId: string
  playerBId: string
  matchId: string | null
  winnerParticipantId: string | null
  unitsWonByA: number
  unitsWonByB: number
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
  bestOfByRound: number[]
  championParticipantId: string | null
  createdAt: Date
  participants: ParticipantRow[]
  slots: SlotRow[]
  groupMatches: GroupMatchRow[]
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
      bestOfByRound: tournament.bestOfByRound,
      championParticipantId: tournament.championParticipantId,
      createdAt: existing?.createdAt ?? tournament.scheduledAt,
      participants: tournament.participants.map((participant) => ({
        id: participant.id.value,
        tournamentId: tournament.id.value,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
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
      groupMatches: tournament.groupMatches.map((match) => ({
        id: match.id.value,
        tournamentId: tournament.id.value,
        groupIndex: match.groupIndex,
        matchupIndex: match.matchupIndex,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        matchId: match.matchId,
        winnerParticipantId: match.winnerParticipantId,
        unitsWonByA: match.unitsWonByA,
        unitsWonByB: match.unitsWonByB,
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
      bestOfByRound: row.bestOfByRound,
      championParticipantId: row.championParticipantId,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        tournamentId: participant.tournamentId,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
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
      groupMatches: row.groupMatches.map((match) => ({
        id: match.id,
        tournamentId: match.tournamentId,
        groupIndex: match.groupIndex,
        matchupIndex: match.matchupIndex,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        matchId: match.matchId,
        winnerParticipantId: match.winnerParticipantId,
        unitsWonByA: match.unitsWonByA,
        unitsWonByB: match.unitsWonByB,
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
    const participantOf = (participantId: string) => {
      const participant = row.participants.find((current) => current.id === participantId)
      return participant
        ? {
            id: participant.id,
            participantId: participant.participantId,
            displayName: participant.displayName,
            nickname: participant.nickname,
            imageUrl: participant.imageUrl,
          }
        : { id: participantId, participantId: '', displayName: '—', nickname: null, imageUrl: null }
    }
    const nameOf = (participantId: string | null) => (participantId ? participantOf(participantId) : null)

    const groupCount = row.size > 32 ? row.size / 4 : 0
    const groups = Array.from({ length: groupCount }, (_, groupIndex) => {
      const matches = row.groupMatches.filter((match) => match.groupIndex === groupIndex)
      const memberIds = [...new Set(matches.flatMap((match) => [match.playerAId, match.playerBId]))]
      const standings = GroupStandingsCalculator.calculate(memberIds, matches)
      return {
        groupIndex,
        matches: matches.map((match) => ({
          id: match.id,
          groupIndex: match.groupIndex,
          matchupIndex: match.matchupIndex,
          matchId: match.matchId,
          playerA: participantOf(match.playerAId),
          playerB: participantOf(match.playerBId),
          winnerParticipantId: match.winnerParticipantId,
        })),
        standings: standings.map((entry, index) => ({
          participant: participantOf(entry.participantId),
          wins: entry.wins,
          unitsWon: entry.unitsWon,
          unitsLost: entry.unitsLost,
          rank: index + 1,
        })),
      }
    })

    return {
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOfByRound: row.bestOfByRound,
      championParticipantId: row.championParticipantId,
      scheduledAt: row.scheduledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        participantId: participant.participantId,
        displayName: participant.displayName,
        nickname: participant.nickname,
        imageUrl: participant.imageUrl,
      })),
      phase: groupCount > 0 && row.slots.length === 0 ? 'group' : 'knockout',
      groups,
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
