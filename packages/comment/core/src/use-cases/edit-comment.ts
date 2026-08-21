import { UseCase, NotFoundError, AccessDeniedError, Errors } from 'shared'
import { CommentRepository } from '../providers'

interface Input {
  commentId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  authorId: string
  body: string
}

/**
 * The author rewrites their own comment. Not the admin's, not anyone else's:
 * a foreign comment answers AccessDenied (403) and not "not found", because a
 * comment is public — everyone can already see it exists, so hiding it would
 * only be theatre (unlike a notification, which is private).
 *
 * The edit is never silent: `Comment.edit` stamps `editedAt` (which every
 * reader sees) and hands back the previous text, persisted alongside it so the
 * admin can still read what was originally posted.
 */
export default class EditComment implements UseCase<Input, void> {
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute({ commentId, authorId, body }: Input): Promise<void> {
    const comment = await this.commentRepository.findById(commentId)
    if (!comment) NotFoundError.throwError(Errors.COMMENT_NOT_FOUND, commentId)
    if (comment!.authorId !== authorId) {
      AccessDeniedError.throwError(Errors.NOT_COMMENT_AUTHOR, commentId)
    }

    // Null = the text is identical, so there is no edit to record: no revision,
    // no "editado" badge, no write at all.
    const revision = comment!.edit(body)
    if (!revision) return

    await this.commentRepository.update(comment!, revision)
  }
}
