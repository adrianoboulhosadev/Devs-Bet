import { GetCommentHistoryQuery, CommentQueryRepository, CommentHistoryDTO } from '@comment/core'
import { AuthenticatedActor } from 'shared'

export default class GetCommentHistoryController {
  constructor(private readonly commentQueryRepository: CommentQueryRepository) {}

  async execute(commentId: string, actor: AuthenticatedActor): Promise<CommentHistoryDTO> {
    return new GetCommentHistoryQuery(this.commentQueryRepository).execute({ commentId }, actor)
  }
}
