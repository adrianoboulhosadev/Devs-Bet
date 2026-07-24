import { MatchRepository, Match, MatchStatus } from '@match/adapters'
import { PrismaClient } from 'database'

type MatchRowWithParticipants = {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: string
  rakeBasisPoints: number
  winnerParticipantId: string | null
  scheduledAt: Date
  lockedAt: Date | null
  settledAt: Date | null
  participants: { id: string; userId: string | null; displayName: string }[]
}

/**
 * Match WRITE port for the worker. The scheduled auto-lock only needs
 * findById + update, but the port is implemented in full (create mirrors the
 * backend) so the worker satisfies MatchRepository.
 */
export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private reconstitute(row: MatchRowWithParticipants): Match {
    return new Match({
      id: row.id,
      creatorId: row.creatorId,
      title: row.title,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as MatchStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      winnerParticipantId: row.winnerParticipantId,
      scheduledAt: row.scheduledAt,
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
        categoryId: match.categoryId,
        imageUrl: match.imageUrl,
        scheduledAt: match.scheduledAt,
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
        title: match.title,
        categoryId: match.categoryId,
        scheduledAt: match.scheduledAt,
        status: match.status,
        winnerParticipantId: match.winnerParticipantId,
        lockedAt: match.lockedAt,
        settledAt: match.settledAt,
      },
    })
  }
}
