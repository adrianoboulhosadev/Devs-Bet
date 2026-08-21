import { CommentSubjectType, CommentThreadDTO, CommentHistoryDTO } from '../model'

/** Comment READ port (query side of CQRS) — plain DTOs, never entities. */
export interface CommentQueryRepository {
  /** The whole thread of one match/tournament, already grouped as roots +
   * replies. Roots newest first (the screen shows the freshest conversation on
   * top); replies oldest first inside each root, which is the order a
   * conversation is read in. */
  listBySubjectQuery(
    subjectType: CommentSubjectType,
    subjectId: string,
  ): Promise<CommentThreadDTO[]>

  /** ADMIN audit view: the current text plus every previous version. Null when
   * the comment does not exist. */
  findHistoryQuery(commentId: string): Promise<CommentHistoryDTO | null>
}
