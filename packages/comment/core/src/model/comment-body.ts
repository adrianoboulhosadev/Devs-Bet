import { ValidationError, Errors } from 'shared'

/**
 * The text of a comment (value object): trimmed, never empty and bounded.
 *
 * The bound lives HERE, as a static of the VO, instead of in a form validator
 * or a database column: the same rule has to hold for the first post, for an
 * edit and for anything the domain reconstitutes, and only one of those three
 * ever goes through a form.
 */
export class CommentBody {
  /** Long enough for a real argument about a match, short enough to stay a
   * comment (and to fit the notification preview a reply produces). */
  static readonly MAX_LENGTH = 1000
  /** How much of the text a reply notification quotes back. */
  static readonly PREVIEW_LENGTH = 80

  readonly value: string

  constructor(value?: string) {
    const text = value?.trim() ?? ''
    if (!text) ValidationError.throwError(Errors.REQUIRED_FIELD, 'body')
    if (text.length > CommentBody.MAX_LENGTH) {
      ValidationError.throwError(Errors.COMMENT_TOO_LONG, text.length, {
        max: CommentBody.MAX_LENGTH,
      })
    }

    this.value = text
  }

  equals(other?: CommentBody): boolean {
    return !!other && this.value === other.value
  }

  /** Single-line excerpt for the "someone replied to you" notification — the
   * inbox quotes the reply, it does not reproduce it. */
  get preview(): string {
    const singleLine = this.value.replace(/\s+/g, ' ')
    return singleLine.length <= CommentBody.PREVIEW_LENGTH
      ? singleLine
      : `${singleLine.slice(0, CommentBody.PREVIEW_LENGTH).trimEnd()}…`
  }
}
