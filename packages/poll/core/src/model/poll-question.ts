import { ValidationError, Errors } from 'shared'

/**
 * What the poll asks (value object): trimmed, never empty and bounded.
 *
 * The bound lives HERE rather than in a form or a column because the question
 * is the CONTRACT the bettors accepted — it is written once, at creation, and
 * never rewritten afterwards (correcting one means cancelling the poll and
 * opening another). A rule that can only be enforced at creation still has to
 * hold when the domain reconstitutes the row.
 */
export class PollQuestion {
  /** Room for a real question ("Até quando fulano fica no cargo?") without
   * turning the card into a paragraph — the criteria field carries the detail. */
  static readonly MAX_LENGTH = 200

  readonly value: string

  constructor(value?: string) {
    const text = value?.trim() ?? ''
    if (!text) ValidationError.throwError(Errors.REQUIRED_FIELD, 'question')
    if (text.length > PollQuestion.MAX_LENGTH) {
      ValidationError.throwError(Errors.POLL_QUESTION_TOO_LONG, text.length, {
        max: PollQuestion.MAX_LENGTH,
      })
    }

    this.value = text
  }

  equals(other?: PollQuestion): boolean {
    return !!other && this.value === other.value
  }
}
