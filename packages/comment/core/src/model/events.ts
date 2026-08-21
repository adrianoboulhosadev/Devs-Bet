import { DomainEvent } from 'shared'
import { CommentSubjectType } from './comment'

/**
 * Someone answered a comment. Raised directly by `PostComment` (not via
 * `AggregateRoot.record`): this is pure CREATION, and `Comment`'s constructor
 * also RECONSTITUTES rows from the database, so it must never raise anything
 * itself — the same reasoning as `UserRegistered`.
 *
 * It carries the excerpt rather than the whole reply: the inbox quotes, it does
 * not reproduce. Who the author IS (a nickname, a truncated id) is resolved by
 * whoever consumes the event — comment knows no identities.
 */
export class CommentReplied extends DomainEvent {
  constructor(
    readonly commentId: string,
    readonly authorId: string,
    readonly parentCommentId: string,
    /** The person notified — the author of the comment being answered. */
    readonly parentAuthorId: string,
    readonly subjectType: CommentSubjectType,
    readonly subjectId: string,
    readonly excerpt: string,
  ) {
    super()
  }
}
