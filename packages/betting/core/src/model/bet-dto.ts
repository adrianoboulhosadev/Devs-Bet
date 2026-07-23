import { BetStatus } from './bet'

/** READ projection (CQRS) of a bet — the user's own history / a match's book. */
export interface BetDTO {
  id: string
  matchId: string
  bettorId: string
  participantId: string
  stake: number
  status: BetStatus
  payout: number
  createdAt: Date
  settledAt: Date | null
}
