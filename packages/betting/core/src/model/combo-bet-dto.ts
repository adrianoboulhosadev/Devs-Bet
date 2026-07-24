import { BetStatus, BetMarketType } from './bet'
import { ComboLegResult } from './combo-leg'

export interface ComboLegDTO {
  marketType: BetMarketType
  marketId: string
  selectionId: string
  odd: number
  result: ComboLegResult
}

/** READ projection (CQRS) of a combo (parlay) bet — the user's ticket history. */
export interface ComboBetDTO {
  id: string
  bettorId: string
  legs: ComboLegDTO[]
  stake: number
  totalOdd: number
  status: BetStatus
  payout: number
  createdAt: Date
  settledAt: Date | null
}
