import { Injectable } from '@nestjs/common'
import { PollRepository, PollQueryRepository, Poll, PollDTO, PollStatus } from '@poll/adapters'
import { PrismaService } from '../db/prisma.service'

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
  createdAt: Date
  closedAt: Date | null
  settledAt: Date | null
  options: { id: string; label: string }[]
}

const includeAggregate = { options: true }

@Injectable()
export class PrismaPollRepository implements PollRepository, PollQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        // Carrying the id is what marks the option as reconstituted rather than
        // new — and it is also the betting selection id, so it must survive.
        id: option.id,
        pollId: row.id,
        label: option.label,
      })),
    })
  }

  async findById(id: string): Promise<Poll | null> {
    const row = await this.prisma.poll.findUnique({ where: { id }, include: includeAggregate })
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

  // Only the lifecycle columns and the deadline move. The question, the criteria
  // and the options are frozen at creation — they are the contract the bettors
  // accepted, so there is deliberately no path here that rewrites them.
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

  async findByIdQuery(id: string): Promise<PollDTO | null> {
    const row = await this.prisma.poll.findUnique({ where: { id }, include: includeAggregate })
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<PollDTO[]> {
    const rows = await this.prisma.poll.findMany({
      include: includeAggregate,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: PollRowWithOptions): PollDTO {
    return {
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
      options: row.options.map((option) => ({ id: option.id, label: option.label })),
      createdAt: row.createdAt,
      closedAt: row.closedAt,
      settledAt: row.settledAt,
    }
  }
}
