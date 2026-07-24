import { Entity, EntityProps } from 'shared'

export interface MatchUnitProps extends EntityProps {
  matchId?: string
  unitNumber?: number
  // null only for the single unit of a bestOf-1 match that allows a draw.
  winnerParticipantId?: string | null
}

/**
 * One unit of a bestOf series (e.g. a single map/leg/round/fight within the
 * match) — a sport-agnostic name, since not every category is "a game" (a
 * boxing bout, a chess game, a map are all just "units" of the match). Part of
 * the Match aggregate; the match tallies unit wins to decide the overall
 * result (Match.recordUnitResult).
 */
export class MatchUnit extends Entity<MatchUnit, MatchUnitProps> {
  readonly matchId: string | null
  readonly unitNumber: number
  readonly winnerParticipantId: string | null

  constructor(props: MatchUnitProps) {
    super(props)
    this.matchId = props.matchId ?? null
    this.unitNumber = props.unitNumber ?? 1
    this.winnerParticipantId = props.winnerParticipantId ?? null
  }
}
