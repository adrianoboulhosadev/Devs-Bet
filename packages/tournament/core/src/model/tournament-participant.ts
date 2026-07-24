import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface TournamentParticipantProps extends EntityProps {
  tournamentId?: string
  // A registered user (logical FK) or null for someone off-platform.
  userId?: string | null
  displayName?: string
}

/**
 * A competitor in a tournament. Part of the Tournament aggregate. The displayName
 * is the NATURAL KEY within a tournament (unique, enforced by the aggregate): the
 * bracket matches are plain Matches whose winners come back as a displayName, and
 * that name maps back to this participant to advance the bracket.
 */
export class TournamentParticipant extends Entity<TournamentParticipant, TournamentParticipantProps> {
  readonly tournamentId: string | null
  readonly userId: string | null
  readonly displayName: string

  constructor(props: TournamentParticipantProps) {
    super(props)
    const displayName = props.displayName?.trim() ?? ''
    if (!displayName) ValidationError.throwError(Errors.REQUIRED_FIELD, 'displayName')
    this.tournamentId = props.tournamentId ?? null
    this.userId = props.userId ?? null
    this.displayName = displayName
  }
}
