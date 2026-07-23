import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface MatchParticipantProps extends EntityProps {
  matchId?: string
  // A registered friend (logical FK to a User) or null for someone off-platform.
  userId?: string | null
  displayName?: string
}

/**
 * A player in a match. Part of the Match aggregate. Carries a displayName always
 * and, optionally, the id of a registered user. Bets pick a participant by its id.
 */
export class MatchParticipant extends Entity<MatchParticipant, MatchParticipantProps> {
  readonly matchId: string | null
  readonly userId: string | null
  readonly displayName: string

  constructor(props: MatchParticipantProps) {
    super(props)
    const displayName = props.displayName?.trim() ?? ''
    if (!displayName) ValidationError.throwError(Errors.REQUIRED_FIELD, 'displayName')
    this.matchId = props.matchId ?? null
    this.userId = props.userId ?? null
    this.displayName = displayName
  }
}
