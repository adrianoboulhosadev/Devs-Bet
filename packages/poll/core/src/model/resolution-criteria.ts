import { ValidationError, Errors } from 'shared'

/**
 * How the poll will be judged, and by which source (value object): trimmed,
 * never empty and bounded.
 *
 * This is the one field that separates a poll from a match. A match's result is
 * observable — someone won the map. A poll asks about the world ("demitido por
 * X"), and whether a resignation, a mutual agreement or a leave of absence
 * counts is exactly what a room of friends argues about AFTER the money is in.
 * Writing the criterion down before the first bet, and never letting it change,
 * is what makes the resolution arguable against something instead of against
 * the admin's memory. Hence REQUIRED — an empty criterion is not a poll.
 */
export class ResolutionCriteria {
  /** A paragraph: enough to name the source and the edge cases, not an essay. */
  static readonly MAX_LENGTH = 500

  readonly value: string

  constructor(value?: string) {
    const text = value?.trim() ?? ''
    if (!text) ValidationError.throwError(Errors.REQUIRED_FIELD, 'resolutionCriteria')
    if (text.length > ResolutionCriteria.MAX_LENGTH) {
      ValidationError.throwError(Errors.RESOLUTION_CRITERIA_TOO_LONG, text.length, {
        max: ResolutionCriteria.MAX_LENGTH,
      })
    }

    this.value = text
  }

  equals(other?: ResolutionCriteria): boolean {
    return !!other && this.value === other.value
  }
}
