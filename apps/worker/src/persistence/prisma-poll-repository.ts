import { PollRepository, Poll, PollStatus } from '@poll/adapters'
import { PrismaClient } from 'database'

type PollRowWithOptions = {
  id: string
  creatorId: string
  question: string
  resolutionCriteria: string
  categoryId: string
  imageUrl: string | null
  status: string
  rakeBasisPoints: number
  winningOptionId: string | null
  closesAt: Date
  closedAt: Date | null
  settledAt: Date | null
  options: { id: string; label: string }[]
}

/**
 * Poll WRITE port for the worker. The scheduled auto-close only needs
 * findById + update, but the port is implemented in full (create mirrors the
 * backend) so the worker satisfies PollRepository.
 */
export class PrismaPollRepository implements PollRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private reconstitute(row: PollRowWithOptions): Poll {
    return new Poll({
      id: row.id,
      creatorId: row.creatorId,
      question: row.question,
      resolutionCriteria: row.resolutionCriteria,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status as PollStatus,
      rakeBasisPoints: row.rakeBasisPoints,
      winningOptionId: row.winningOptionId,
      closesAt: row.closesAt,
      closedAt: row.closedAt,
      settledAt: row.settledAt,
      options: row.options.map((option) => ({
        id: option.id,
        pollId: row.id,
        label: option.label,
      })),
    })
  }

  async findById(id: string): Promise<Poll | null> {
    const row = await this.prisma.poll.findUnique({ where: { id }, include: { options: true } })
    return row ? this.reconstitute(row) : null
  }

  async create(poll: Poll): Promise<void> {
    await this.prisma.poll.create({
      data: {
        id: poll.id.value,
        creatorId: poll.creatorId,
        question: poll.question.value,
        resolutionCriteria: poll.resolutionCriteria.value,
        categoryId: poll.categoryId,
        imageUrl: poll.imageUrl,
        closesAt: poll.closesAt,
        status: poll.status,
        rakeBasisPoints: poll.rakeBasisPoints,
        winningOptionId: poll.winningOptionId,
        options: {
          create: poll.options.map((option) => ({
            id: option.id.value,
            label: option.label.value,
          })),
        },
      },
    })
  }

  async update(poll: Poll): Promise<void> {
    await this.prisma.poll.update({
      where: { id: poll.id.value },
      data: {
        closesAt: poll.closesAt,
        status: poll.status,
        winningOptionId: poll.winningOptionId,
        closedAt: poll.closedAt,
        settledAt: poll.settledAt,
      },
    })
  }
}
