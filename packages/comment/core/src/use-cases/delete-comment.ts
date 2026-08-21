import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { CommentRepository } from '../providers'

interface Input {
  commentId: string
}

/**
 * The admin removes a comment (the red bin on every line of the thread) —
 * moderation of a closed, friends-only room, so there is one moderator and it
 * is the owner. Admin-only by inheritance (AdminUseCase), on top of the
 * backend's role guard at the edge.
 *
 * Deleting a ROOT takes its replies with it (see the port): the answers only
 * make sense under what they answered.
 */
export default class DeleteComment extends AdminUseCase<Input, void> {
  constructor(private readonly commentRepository: CommentRepository) {
    super()
  }

  protected async executeAsAdmin({ commentId }: Input): Promise<void> {
    const comment = await this.commentRepository.findById(commentId)
    if (!comment) NotFoundError.throwError(Errors.COMMENT_NOT_FOUND, commentId)

    await this.commentRepository.deleteWithReplies(commentId)
  }
}
