import { BetStatus, BetMarketType } from './bet'

/** READ projection (CQRS) of a bet — the user's own history / a market's book. */
export interface BetDTO {
  id: string
  marketType: BetMarketType
  marketId: string
  bettorId: string
  selectionId: string
  stake: number
  status: BetStatus
  payout: number
  createdAt: Date
  settledAt: Date | null
}
