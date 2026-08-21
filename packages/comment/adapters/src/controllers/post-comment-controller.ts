import { PostComment, CommentRepository } from '@comment/core'
import { EventPublisher } from 'shared'
import { PostCommentInput } from '../@types'

export default class PostCommentController {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  // `subjectExists` is resolved cross-context by the backend (does the
  // match/tournament exist?) — comment never imports either context.
  async execute(input: PostCommentInput, authorId: string, subjectExists: boolean): Promise<void> {
    await new PostComment(this.commentRepository, this.eventPublisher).execute({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      authorId,
      parentId: input.parentId,
      body: input.body,
      subjectExists,
    })
  }
}
