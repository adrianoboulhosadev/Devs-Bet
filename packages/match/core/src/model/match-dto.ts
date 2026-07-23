import { MatchStatus } from './match'

export interface MatchParticipantDTO {
  id: string
  userId: string | null
  displayName: string
}

/** READ projection (CQRS) of a match, with its participants, for the lobby/detail. */
export interface MatchDTO {
  id: string
  creatorId: string
  title: string
  gameType: string | null
  status: MatchStatus
  rakeBasisPoints: number
  winnerParticipantId: string | null
  scheduledAt: Date
  participants: MatchParticipantDTO[]
  createdAt: Date
  lockedAt: Date | null
  settledAt: Date | null
}
