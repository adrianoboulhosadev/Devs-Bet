import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface TournamentParticipantProps extends EntityProps {
  tournamentId?: string
  // Logical FK to the participant catalog (packages/participant). Required —
  // creating a tournament always picks existing catalog entries.
  participantId?: string
  // Snapshotted from the catalog at tournament-creation time (immutable
  // afterwards, even if the catalog entry is later renamed).
  displayName?: string
  nickname?: string | null
  imageUrl?: string | null
}

/**
 * A competitor in a tournament. Part of the Tournament aggregate. The displayName
 * is the NATURAL KEY within a tournament (unique, enforced by the aggregate): the
 * bracket matches are plain Matches whose winners come back as a displayName, and
 * that name maps back to this participant to advance the bracket.
 */
export class TournamentParticipant extends Entity<TournamentParticipant, TournamentParticipantProps> {
  readonly tournamentId: string | null
  readonly participantId: string
  readonly displayName: string
  readonly nickname: string | null
  readonly imageUrl: string | null

  constructor(props: TournamentParticipantProps) {
    super(props)
    const displayName = props.displayName?.trim() ?? ''
    if (!displayName) ValidationError.throwError(Errors.REQUIRED_FIELD, 'displayName')
    const participantId = props.participantId?.trim() ?? ''
    if (!participantId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'participantId')

    this.tournamentId = props.tournamentId ?? null
    this.participantId = participantId
    this.displayName = displayName
    this.nickname = props.nickname ?? null
    this.imageUrl = props.imageUrl ?? null
  }
}
