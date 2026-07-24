import { Entity, EntityProps } from 'shared'

export interface BracketSlotProps extends EntityProps {
  tournamentId?: string
  round: number
  position: number
  // The Match (logical FK) that decides this slot; null until the two players are
  // known and the backend creates it.
  matchId?: string | null
  // The two TournamentParticipant ids facing off here; null while still undecided
  // (a later round waiting for its feeder slots to settle).
  playerAId?: string | null
  playerBId?: string | null
}

/**
 * One node of the bracket: a single confrontation at (round, position). Part of
 * the Tournament aggregate. Round 0 is the fullest round; the last round is the
 * final. A slot is "ready" once both players are known and "pending a match" when
 * it is ready but no Match has been attached yet.
 */
export class BracketSlot extends Entity<BracketSlot, BracketSlotProps> {
  readonly tournamentId: string | null
  readonly round: number
  readonly position: number
  matchId: string | null
  playerAId: string | null
  playerBId: string | null

  constructor(props: BracketSlotProps) {
    super(props)
    this.tournamentId = props.tournamentId ?? null
    this.round = props.round
    this.position = props.position
    this.matchId = props.matchId ?? null
    this.playerAId = props.playerAId ?? null
    this.playerBId = props.playerBId ?? null
  }

  /** Both competitors are known (the confrontation can be played). */
  get isReady(): boolean {
    return this.playerAId !== null && this.playerBId !== null
  }

  /** Ready but no Match created yet — the backend must create one. */
  get needsMatch(): boolean {
    return this.isReady && this.matchId === null
  }
}
