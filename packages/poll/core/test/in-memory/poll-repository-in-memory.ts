import { PollRepository, PollQueryRepository, Poll, PollDTO, PollStatus } from '../../src'

interface OptionRow {
  id: string
  pollId: string
  label: string
}

interface PollRow {
  id: string
  creatorId: string
  question: string
  resolutionCriteria: string
  categoryId: string
  imageUrl: string | null
  closesAt: Date
  status: PollStatus
  rakeBasisPoints: number
  winningOptionId: string | null
  createdAt: Date
  closedAt: Date | null
  settledAt: Date | null
}

export default class PollRepositoryInMemory implements PollRepository, PollQueryRepository {
  readonly polls: PollRow[] = []
  readonly options: OptionRow[] = []

  // Rebuilds the aggregate from the rows, exactly as the Prisma adapter does —
  // option ids are carried over, since they are the betting selection ids.
  private reconstitute(row: PollRow): Poll {
    return new Poll({
      id: row.id,
      creatorId: row.creatorId,
      question: row.question,
      resolutionCriteria: row.resolutionCriteria,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      closesAt: row.closesAt,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      winningOptionId: row.winningOptionId,
      closedAt: row.closedAt,
      settledAt: row.settledAt,
      options: this.optionsOf(row.id).map((option) => ({
        id: option.id,
        pollId: option.pollId,
        label: option.label,
      })),
    })
  }

  private optionsOf(pollId: string): OptionRow[] {
    return this.options.filter((option) => option.pollId === pollId)
  }

  private toDTO(row: PollRow): PollDTO {
    return {
      id: row.id,
      creatorId: row.creatorId,
      question: row.question,
      resolutionCriteria: row.resolutionCriteria,
      categoryId: row.categoryId,
      imageUrl: row.imageUrl,
      status: row.status,
      rakeBasisPoints: row.rakeBasisPoints,
      winningOptionId: row.winningOptionId,
      closesAt: row.closesAt,
      options: this.optionsOf(row.id).map((option) => ({ id: option.id, label: option.label })),
      createdAt: row.createdAt,
      closedAt: row.closedAt,
      settledAt: row.settledAt,
    }
  }

  async findById(id: string): Promise<Poll | null> {
    const row = this.polls.find((poll) => poll.id === id)
    return row ? this.reconstitute(row) : null
  }

  async create(poll: Poll): Promise<void> {
    this.polls.push({
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
      createdAt: new Date(),
      closedAt: poll.closedAt,
      settledAt: poll.settledAt,
    })
    for (const option of poll.options) {
      this.options.push({
        id: option.id.value,
        pollId: poll.id.value,
        label: option.label.value,
      })
    }
  }

  // Only the lifecycle fields move — the question, the criteria and the options
  // are frozen at creation (see the Poll class comment).
  async update(poll: Poll): Promise<void> {
    const row = this.polls.find((current) => current.id === poll.id.value)
    if (row) {
      row.closesAt = poll.closesAt
      row.status = poll.status
      row.winningOptionId = poll.winningOptionId
      row.closedAt = poll.closedAt
      row.settledAt = poll.settledAt
    }
  }

  async findByIdQuery(id: string): Promise<PollDTO | null> {
    const row = this.polls.find((poll) => poll.id === id)
    return row ? this.toDTO(row) : null
  }

  async listQuery(): Promise<PollDTO[]> {
    return [...this.polls]
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .map((row) => this.toDTO(row))
  }
}
