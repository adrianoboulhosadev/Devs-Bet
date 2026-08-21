import { Entity, EntityProps, ValidationError, Errors } from 'shared'
import { CommentBody } from './comment-body'
import { CommentRevision } from './comment-revision'

/** What can be commented on. A tiny union of its own instead of importing
 * match/tournament — comment touches no other context (same choice as
 * notification's NotificationMarketKind). */
export const COMMENT_SUBJECT_TYPES = ['match', 'tournament'] as const

export type CommentSubjectType = (typeof COMMENT_SUBJECT_TYPES)[number]

export interface CommentProps extends EntityProps {
  subjectType?: CommentSubjectType
  /** The match/tournament id — a LOGICAL FK; comment never loads either. */
  subjectId?: string
  authorId?: string
  /** The ROOT comment this one answers. Null = it is itself a root. */
  parentId?: string | null
  body?: string
  createdAt?: Date
  editedAt?: Date | null
}

/**
 * One comment on a match or a tournament (rich entity).
 *
 * The thread is TWO levels deep on purpose (a root and its replies, like
 * Facebook's): `parentId` always points at a root, and the use case rejects a
 * reply to a reply. Deeper nesting reads badly on a phone and would need a
 * whole tree just to render a conversation nobody follows that far.
 *
 * Editing keeps the history: `edit` produces the CommentRevision of the text as
 * it was, and stamps `editedAt` so every reader sees the comment was rewritten
 * and when — the admin is the only one who gets to read the previous version.
 */
export class Comment extends Entity<Comment, CommentProps> {
  readonly subjectType: CommentSubjectType
  readonly subjectId: string
  readonly authorId: string
  readonly parentId: string | null
  readonly createdAt: Date
  body: CommentBody
  editedAt: Date | null

  constructor(props: CommentProps) {
    super(props)
    if (!props.subjectType || !COMMENT_SUBJECT_TYPES.includes(props.subjectType)) {
      ValidationError.throwError(Errors.REQUIRED_FIELD, 'subjectType')
    }

    const subjectId = props.subjectId?.trim() ?? ''
    if (!subjectId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'subjectId')

    const authorId = props.authorId?.trim() ?? ''
    if (!authorId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'authorId')

    this.subjectType = props.subjectType
    this.subjectId = subjectId
    this.authorId = authorId
    this.parentId = props.parentId ?? null
    this.body = new CommentBody(props.body)
    this.createdAt = props.createdAt ?? new Date()
    this.editedAt = props.editedAt ?? null
  }

  get isReply(): boolean {
    return this.parentId !== null
  }

  get wasEdited(): boolean {
    return this.editedAt !== null
  }

  /** True when `other` can be answered by a reply to THIS subject: it has to be
   * a root comment of the very same match/tournament. Keeps the rule in the
   * model instead of as three `if`s inside PostComment. */
  canBeRepliedFrom(subjectType: CommentSubjectType, subjectId: string): boolean {
    return !this.isReply && this.subjectType === subjectType && this.subjectId === subjectId
  }

  /**
   * Rewrites the text and RETURNS the audit record of what it said before —
   * null when the text did not actually change (re-submitting the same body
   * must not fake an edit, nor add a revision that says nothing).
   *
   * Who may edit is not decided here: the use case knows the caller. What the
   * model guarantees is that an edit can never happen silently.
   */
  edit(newBody: string): CommentRevision | null {
    const next = new CommentBody(newBody)
    if (next.equals(this.body)) return null

    const previous = new CommentRevision({ commentId: this.id.value, body: this.body.value })
    this.body = next
    this.editedAt = new Date()
    return previous
  }
}
