import { DeleteMyComment, CommentRepository } from '@comment/core'

export default class DeleteMyCommentController {
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(commentId: string, authorId: string): Promise<void> {
    await new DeleteMyComment(this.commentRepository).execute({ commentId, authorId })
  }
}
