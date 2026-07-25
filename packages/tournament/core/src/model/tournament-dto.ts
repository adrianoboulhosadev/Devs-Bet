import { TournamentStatus } from './tournament'

export interface TournamentParticipantDTO {
  id: string
  participantId: string
  displayName: string
  nickname: string | null
  imageUrl: string | null
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

/** One round-robin matchup in the read model — always has both players (unlike
 * a BracketSlotDTO, the group stage is scheduled upfront). */
export interface GroupMatchDTO {
  id: string
  groupIndex: number
  matchupIndex: number
  matchId: string | null
  playerA: TournamentParticipantDTO
  playerB: TournamentParticipantDTO
  winnerParticipantId: string | null
}

/** One group's live standings row. `rank` is 1-based; rank 1 and 2 qualify for
 * the knockout bracket. Computed by GroupStandingsCalculator — updates as each
 * matchup settles, so it doubles as a mid-group-stage progress view. */
export interface GroupStandingDTO {
  participant: TournamentParticipantDTO
  wins: number
  unitsWon: number
  unitsLost: number
  rank: number
}

export interface GroupDTO {
  groupIndex: number
  matches: GroupMatchDTO[]
  standings: GroupStandingDTO[]
}

/** READ projection (CQRS) of a tournament, with its participants and full bracket.
 * `phase`/`groups` only matter for a > 32-participant tournament (hasGroupStage):
 * `groups` is empty and `phase` is always 'knockout' otherwise. `phase` is
 * 'group' until every group matchup is settled, then flips to 'knockout' once
 * the bracket (fed by each group's top two) is built — see Tournament.phase. */
export interface TournamentDTO {
  id: string
  creatorId: string
  title: string
  categoryId: string
  imageUrl: string | null
  status: TournamentStatus
  size: number
  rakeBasisPoints: number
  bestOfByRound: number[]
  championParticipantId: string | null
  scheduledAt: Date
  participants: TournamentParticipantDTO[]
  phase: 'group' | 'knockout'
  groups: GroupDTO[]
  bracket: BracketSlotDTO[]
  createdAt: Date
}
