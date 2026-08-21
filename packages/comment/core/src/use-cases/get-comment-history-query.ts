import { AdminUseCase, NotFoundError, Errors } from 'shared'
import { CommentHistoryDTO } from '../model'
import { CommentQueryRepository } from '../providers'

interface Input {
  commentId: string
}

/**
 * ADMIN-only: what a comment says now and every text it said before. The badge
 * on screen tells everyone a comment was edited; this is the other half of that
 * promise — the moderator can see what it used to say, so an edit cannot be
 * used to erase what someone actually wrote.
 */
export default class GetCommentHistoryQuery extends AdminUseCase<Input, CommentHistoryDTO> {
  constructor(private readonly commentQueryRepository: CommentQueryRepository) {
    super()
  }

  protected async executeAsAdmin({ commentId }: Input): Promise<CommentHistoryDTO> {
    const history = await this.commentQueryRepository.findHistoryQuery(commentId)
    if (!history) NotFoundError.throwError(Errors.COMMENT_NOT_FOUND, commentId)
    return history!
  }
}
