import {
  CommentRepository,
  CommentQueryRepository,
  CommentSubjectType,
  CommentThreadDTO,
  CommentHistoryDTO,
} from '@comment/core'
import { AuthenticatedActor, EventPublisher } from 'shared'
import {
  PostCommentController,
  EditCommentController,
  DeleteMyCommentController,
  DeleteCommentController,
  ListCommentsController,
  GetCommentHistoryController,
} from '../controllers'
import { PostCommentInput, EditCommentInput } from '../@types'

/**
 * Single entry point the backend (NestJS) calls. Optional ports in the
 * constructor; each method builds its controller. The admin actor (id + role)
 * comes from the JWT — the role is re-checked inside each admin use case.
 */
export default class CommentFacade {
  constructor(
    private readonly commentRepository?: CommentRepository,
    private readonly commentQueryRepository?: CommentQueryRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async postComment(
    input: PostCommentInput,
    authorId: string,
    subjectExists: boolean,
  ): Promise<void> {
    await new PostCommentController(this.commentRepository!, this.eventPublisher).execute(
      input,
      authorId,
      subjectExists,
    )
  }

  async editComment(commentId: string, input: EditCommentInput, authorId: string): Promise<void> {
    await new EditCommentController(this.commentRepository!).execute(commentId, input, authorId)
  }

  /** The AUTHOR withdrawing their own comment (soft delete) — not the same
   * operation as `deleteComment`, which is the admin's permanent removal. */
  async deleteMyComment(commentId: string, authorId: string): Promise<void> {
    await new DeleteMyCommentController(this.commentRepository!).execute(commentId, authorId)
  }

  async deleteComment(commentId: string, actor: AuthenticatedActor): Promise<void> {
    await new DeleteCommentController(this.commentRepository!).execute(commentId, actor)
  }

  async listComments(
    subjectType: CommentSubjectType,
    subjectId: string,
  ): Promise<CommentThreadDTO[]> {
    return new ListCommentsController(this.commentQueryRepository!).execute(subjectType, subjectId)
  }

  async getCommentHistory(commentId: string, actor: AuthenticatedActor): Promise<CommentHistoryDTO> {
    return new GetCommentHistoryController(this.commentQueryRepository!).execute(commentId, actor)
  }
}
