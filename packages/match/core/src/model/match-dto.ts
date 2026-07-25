import { MatchStatus } from './match'

export interface MatchParticipantDTO {
  id: string
  participantId: string
  displayName: string
  nickname: string | null
  imageUrl: string | null
}

export interface MatchUnitDTO {
  unitNumber: number
  winnerParticipantId: string | null
}

/** READ projection (CQRS) of a match, with its participants, for the lobby/detail. */
export interface MatchDTO {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: MatchStatus
  rakeBasisPoints: number
  bestOf: number
  allowsDraw: boolean
  winnerParticipantId: string | null
  scheduledAt: Date
  participants: MatchParticipantDTO[]
  units: MatchUnitDTO[]
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
}
