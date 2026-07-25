import { Injectable } from '@nestjs/common'
import {
  TournamentRepository,
  TournamentQueryRepository,
  Tournament,
  TournamentDTO,
  TournamentStatus,
  GroupStandingsCalculator,
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
type GroupMatchRow = {
  id: string
  groupIndex: number
  matchupIndex: number
  playerAId: string
  playerBId: string
  matchId: string | null
  winnerParticipantId: string | null
  unitsWonByA: number
  unitsWonByB: number
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
  bestOfByRound: number[]
  championParticipantId: string | null
  scheduledAt: Date
  createdAt: Date
  participants: ParticipantRow[]
  slots: SlotRow[]
  groupMatches: GroupMatchRow[]
}

@Injectable()
export class PrismaTournamentRepository
  implements TournamentRepository, TournamentQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private static readonly INCLUDE = {
    participants: true,
    slots: { orderBy: [{ round: 'asc' as const }, { position: 'asc' as const }] },
    groupMatches: { orderBy: [{ groupIndex: 'asc' as const }, { matchupIndex: 'asc' as const }] },
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
      bestOfByRound: row.bestOfByRound,
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
      groupMatches: row.groupMatches.map((match) => ({
        id: match.id,
        tournamentId: row.id,
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
        bestOfByRound: tournament.bestOfByRound,
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
        groupMatches: {
          create: tournament.groupMatches.map((match) => ({
            id: match.id.value,
            groupIndex: match.groupIndex,
            matchupIndex: match.matchupIndex,
            playerAId: match.playerAId,
            playerBId: match.playerBId,
            matchId: match.matchId,
            winnerParticipantId: match.winnerParticipantId,
            unitsWonByA: match.unitsWonByA,
            unitsWonByB: match.unitsWonByB,
          })),
        },
      },
    })
  }

  async update(tournament: Tournament): Promise<void> {
    // Persist the mutable state atomically: the tournament (status/champion),
    // each group matchup (result) and each slot (players advanced + attached
    // match). Slots are UPSERTED — a group-stage tournament's knockout bracket
    // doesn't exist as rows until the group stage completes and builds it
    // (Tournament.startKnockoutFromGroups), unlike a plain tournament's slots,
    // which are always created upfront. Participants are immutable.
    await this.prisma.$transaction([
      this.prisma.tournament.update({
        where: { id: tournament.id.value },
        data: {
          status: tournament.status,
          championParticipantId: tournament.championParticipantId,
        },
      }),
      ...tournament.slots.map((slot) =>
        this.prisma.tournamentSlot.upsert({
          where: { id: slot.id.value },
          create: {
            id: slot.id.value,
            tournamentId: tournament.id.value,
            round: slot.round,
            position: slot.position,
            matchId: slot.matchId,
            playerAId: slot.playerAId,
            playerBId: slot.playerBId,
          },
          update: {
            matchId: slot.matchId,
            playerAId: slot.playerAId,
            playerBId: slot.playerBId,
          },
        }),
      ),
      ...tournament.groupMatches.map((match) =>
        this.prisma.tournamentGroupMatch.update({
          where: { id: match.id.value },
          data: {
            matchId: match.matchId,
            winnerParticipantId: match.winnerParticipantId,
            unitsWonByA: match.unitsWonByA,
            unitsWonByB: match.unitsWonByB,
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
    const participantOf = (participantId: string) => {
      const participant = row.participants.find((current) => current.id === participantId)
      return participant
        ? { id: participant.id, userId: participant.userId, displayName: participant.displayName }
        : { id: participantId, userId: null, displayName: '—' }
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
      status: row.status as TournamentStatus,
      size: row.size,
      rakeBasisPoints: row.rakeBasisPoints,
      bestOfByRound: row.bestOfByRound,
      championParticipantId: row.championParticipantId,
      scheduledAt: row.scheduledAt,
      participants: row.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        displayName: participant.displayName,
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
