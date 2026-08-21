import { Entity, EntityProps } from 'shared'
import { PollOptionLabel } from './poll-option-label'

export interface PollOptionProps extends EntityProps {
  pollId?: string
  label?: string
}

/**
 * One answer of a poll. Part of the Poll aggregate — its id is the betting
 * SELECTION id, exactly as a match participant's id is (the parimutuel pool is
 * split per selection, and the betting context never learns what a poll is).
 */
export class PollOption extends Entity<PollOption, PollOptionProps> {
  readonly pollId: string | null
  readonly label: PollOptionLabel

  constructor(props: PollOptionProps) {
    super(props)
    this.label = new PollOptionLabel(props.label)
    this.pollId = props.pollId ?? null
  }
}
