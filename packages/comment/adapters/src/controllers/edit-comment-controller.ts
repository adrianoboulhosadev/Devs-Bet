import { EditComment, CommentRepository } from '@comment/core'
import { EditCommentInput } from '../@types'

export default class EditCommentController {
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(commentId: string, input: EditCommentInput, authorId: string): Promise<void> {
    await new EditComment(this.commentRepository).execute({ commentId, authorId, body: input.body })
  }
}
