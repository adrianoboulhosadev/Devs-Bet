import { Entity, EntityProps } from 'shared'

export interface GroupMatchSlotProps extends EntityProps {
  tournamentId?: string
  groupIndex: number
  matchupIndex: number
  playerAId: string
  playerBId: string
  matchId?: string | null
  winnerParticipantId?: string | null
  // Units won by each side once the confrontation settles (0 until then) — feed
  // the group's whole-table unit differential, the standings tiebreak after
  // head-to-head (see GroupStandingsCalculator).
  unitsWonByA?: number
  unitsWonByB?: number
}

/**
 * One round-robin matchup within a group. Part of the Tournament aggregate —
 * unlike a BracketSlot, every GroupMatchSlot's two players are known upfront
 * (the whole group stage is scheduled at once, no dependency on prior results).
 */
export class GroupMatchSlot extends Entity<GroupMatchSlot, GroupMatchSlotProps> {
  readonly tournamentId: string | null
  readonly groupIndex: number
  readonly matchupIndex: number
  readonly playerAId: string
  readonly playerBId: string
  matchId: string | null
  winnerParticipantId: string | null
  unitsWonByA: number
  unitsWonByB: number

  constructor(props: GroupMatchSlotProps) {
    super(props)
    this.tournamentId = props.tournamentId ?? null
    this.groupIndex = props.groupIndex
    this.matchupIndex = props.matchupIndex
    this.playerAId = props.playerAId
    this.playerBId = props.playerBId
    this.matchId = props.matchId ?? null
    this.winnerParticipantId = props.winnerParticipantId ?? null
    this.unitsWonByA = props.unitsWonByA ?? 0
    this.unitsWonByB = props.unitsWonByB ?? 0
  }

  /** No Match created yet — every group matchup is ready from the start (round-
   * robin, unlike the bracket's later rounds), so this is the only gate. */
  get needsMatch(): boolean {
    return this.matchId === null
  }

  get isSettled(): boolean {
    return this.winnerParticipantId !== null
  }
}
