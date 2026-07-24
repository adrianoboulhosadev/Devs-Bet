import { TournamentStatus } from './tournament'

export interface TournamentParticipantDTO {
  id: string
  userId: string | null
  displayName: string
}

/** A bracket node in the read model. `playerA`/`playerB` are resolved (id +
 * name) when known, else null; `matchId` links to the Match the front fetches to
 * show live status/odds and place per-confrontation bets. */
export interface BracketSlotDTO {
  id: string
  round: number
  position: number
  matchId: string | null
  playerA: TournamentParticipantDTO | null
  playerB: TournamentParticipantDTO | null
}

/** READ projection (CQRS) of a tournament, with its participants and full bracket. */
export interface TournamentDTO {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: TournamentStatus
  size: number
  rakeBasisPoints: number
  bestOf: number
  championParticipantId: string | null
  scheduledAt: Date
  participants: TournamentParticipantDTO[]
  bracket: BracketSlotDTO[]
  createdAt: Date
}
