import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface ParticipantProps extends EntityProps {
  name?: string
  nickname?: string | null
  imageUrl?: string | null
}

/**
 * A reusable competitor profile (rich entity): the admin manages a catalog of
 * these once, and a match/tournament is created by PICKING from it instead of
 * typing a name every time. MatchParticipant/TournamentParticipant snapshot
 * name/nickname/imageUrl from here (by participantId, a logical FK) at the
 * moment they are created — editing a Participant later never changes the
 * history of a match/tournament that already used it.
 */
export class Participant extends Entity<Participant, ParticipantProps> {
  name: string
  nickname: string | null
  imageUrl: string | null

  constructor(props: ParticipantProps) {
    super(props)
    const name = props.name?.trim() ?? ''
    if (!name) ValidationError.throwError(Errors.REQUIRED_FIELD, 'name')

    this.name = name
    this.nickname = props.nickname?.trim() || null
    this.imageUrl = props.imageUrl ?? null
  }

  /** Admin edits any subset of fields. Name uniqueness is re-checked by the use
   * case (needs the repository), same as Category.rename. */
  edit(fields: { name?: string; nickname?: string | null; imageUrl?: string | null }): void {
    if (fields.name !== undefined) {
      const name = fields.name.trim()
      if (!name) ValidationError.throwError(Errors.REQUIRED_FIELD, 'name')
      this.name = name
    }
    if (fields.nickname !== undefined) this.nickname = fields.nickname?.trim() || null
    if (fields.imageUrl !== undefined) this.imageUrl = fields.imageUrl
  }
}
