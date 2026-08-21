import { Entity, EntityProps, ValidationError, Errors } from 'shared'

export interface CommentRevisionProps extends EntityProps {
  commentId?: string
  /** The text as it was BEFORE the edit that produced this row. */
  body?: string
  recordedAt?: Date
}

/**
 * One previous version of a comment — APPEND-ONLY, same spirit as the wallet's
 * ledger: nothing here is ever edited or deleted, it exists so the admin can
 * read what a comment said before its author rewrote it.
 *
 * Produced by `Comment.edit`, never by a caller: the only moment a previous
 * text exists is the instant it stops being the current one.
 *
 * The body is stored as a plain string, not a CommentBody: it was already
 * validated when it WAS the comment, and history must survive a later change to
 * the rule (a shorter MAX_LENGTH must not make an old revision unreadable).
 */
export class CommentRevision extends Entity<CommentRevision, CommentRevisionProps> {
  readonly commentId: string
  readonly body: string
  readonly recordedAt: Date

  constructor(props: CommentRevisionProps) {
    super(props)
    const commentId = props.commentId?.trim() ?? ''
    if (!commentId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'commentId')

    const body = props.body?.trim() ?? ''
    if (!body) ValidationError.throwError(Errors.REQUIRED_FIELD, 'body')

    this.commentId = commentId
    this.body = body
    this.recordedAt = props.recordedAt ?? new Date()
  }
}
