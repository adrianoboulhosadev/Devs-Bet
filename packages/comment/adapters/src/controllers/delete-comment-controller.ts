import { DeleteComment, CommentRepository } from '@comment/core'
import { AuthenticatedActor } from 'shared'

export default class DeleteCommentController {
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(commentId: string, actor: AuthenticatedActor): Promise<void> {
    await new DeleteComment(this.commentRepository).execute({ commentId }, actor)
  }
}
