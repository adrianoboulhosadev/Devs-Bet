import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface MatchParticipantProps extends EntityProps {
  matchId?: string
  // Logical FK to the participant catalog (packages/participant). Required —
  // creating a match always picks an existing catalog entry.
  participantId?: string
  // Snapshotted from the catalog at match-creation time (immutable
  // afterwards, even if the catalog entry is later renamed).
  displayName?: string
  nickname?: string | null
  imageUrl?: string | null
}

/**
 * A player in a match. Part of the Match aggregate. Bets pick a participant by
 * its id.
 */
export class MatchParticipant extends Entity<MatchParticipant, MatchParticipantProps> {
  readonly matchId: string | null
  readonly participantId: string
  readonly displayName: string
  readonly nickname: string | null
  readonly imageUrl: string | null

  constructor(props: MatchParticipantProps) {
    super(props)
    const displayName = props.displayName?.trim() ?? ''
    if (!displayName) ValidationError.throwError(Errors.REQUIRED_FIELD, 'displayName')
    const participantId = props.participantId?.trim() ?? ''
    if (!participantId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'participantId')

    this.matchId = props.matchId ?? null
    this.participantId = participantId
    this.displayName = displayName
    this.nickname = props.nickname ?? null
    this.imageUrl = props.imageUrl ?? null
  }
}
