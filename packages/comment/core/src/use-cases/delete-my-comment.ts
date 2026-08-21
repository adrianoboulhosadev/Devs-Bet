import { UseCase, NotFoundError, AccessDeniedError, Errors } from 'shared'
import { CommentRepository } from '../providers'

interface Input {
  commentId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  authorId: string
}

/**
 * The author withdraws their own comment — a SOFT delete (`Comment.softDelete`).
 *
 * Deliberately not the same operation as the admin's bin (DeleteComment):
 * erasing the row would take every reply with it, and the replies belong to the
 * people who wrote them, not to whoever started the thread. So the line stays,
 * the text stops being served to readers, and the admin can still read what was
 * said — the same deal the edit history already offers.
 *
 * Someone else's comment answers 403/NOT_COMMENT_AUTHOR, not 404: a comment is
 * public, so pretending it does not exist would be theatre (same choice as
 * EditComment).
 */
export default class DeleteMyComment implements UseCase<Input, void> {
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute({ commentId, authorId }: Input): Promise<void> {
    const comment = await this.commentRepository.findById(commentId)
    if (!comment) NotFoundError.throwError(Errors.COMMENT_NOT_FOUND, commentId)
    if (comment!.authorId !== authorId) {
      AccessDeniedError.throwError(Errors.NOT_COMMENT_AUTHOR, commentId)
    }

    if (comment!.isDeleted) return // idempotent: keeps the original timestamp

    comment!.softDelete()
    await this.commentRepository.softDelete(comment!)
  }
}
