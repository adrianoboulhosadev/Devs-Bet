import { PollStatus } from './poll'

export interface PollOptionDTO {
  id: string
  label: string
}

/** READ projection (CQRS) of a poll, with its options, for the lobby/detail. */
export interface PollDTO {
  id: string
  creatorId: string
  question: string
  resolutionCriteria: string
  categoryId: string
  imageUrl: string | null
  status: PollStatus
  rakeBasisPoints: number
  winningOptionId: string | null
  closesAt: Date
  options: PollOptionDTO[]
  createdAt: Date
  closedAt: Date | null
  settledAt: Date | null
}
