import { ValidationError, Errors } from 'shared'

/**
 * The text of one answer a bettor can back (value object): trimmed, never empty
 * and bounded.
 *
 * Free text, NOT a catalog entry (unlike a match's participants): "Sim", "Não",
 * "Até dezembro/2026" are answers, not competitors worth reusing across polls.
 */
export class PollOptionLabel {
  /** A short answer — the option is a button on a card, not a sentence. */
  static readonly MAX_LENGTH = 80

  readonly value: string

  constructor(value?: string) {
    const text = value?.trim() ?? ''
    if (!text) ValidationError.throwError(Errors.REQUIRED_FIELD, 'label')
    if (text.length > PollOptionLabel.MAX_LENGTH) {
      ValidationError.throwError(Errors.POLL_OPTION_TOO_LONG, text.length, {
        max: PollOptionLabel.MAX_LENGTH,
      })
    }

    this.value = text
  }

  equals(other?: PollOptionLabel): boolean {
    return !!other && this.value === other.value
  }

  /** Case/space-insensitive key used to reject two options that read the same
   * ("Sim" and "sim " are the same answer to a human, so they are here too). */
  get comparisonKey(): string {
    return this.value.toLowerCase().replace(/\s+/g, ' ')
  }
}
