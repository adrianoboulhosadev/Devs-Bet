import { UseCase } from 'shared'
import { CommentSubjectType, CommentDTO, CommentThreadDTO } from '../model'
import { CommentQueryRepository } from '../providers'

interface Input {
  subjectType: CommentSubjectType
  subjectId: string
}

/**
 * The comment thread of one match/tournament, open to any authenticated user
 * — the conversation is the room's, not private. Read side: plain DTOs.
 *
 * A comment the author withdrew comes back as a TOMBSTONE: it keeps its place
 * and its replies, but its text is redacted HERE, once, for every reader —
 * the repository stays a dumb reader of rows, and no route can accidentally
 * serve the text (the admin reads it through GetCommentHistoryQuery instead).
 */
export default class ListCommentsQuery implements UseCase<Input, CommentThreadDTO[]> {
  constructor(private readonly commentQueryRepository: CommentQueryRepository) {}

  async execute({ subjectType, subjectId }: Input): Promise<CommentThreadDTO[]> {
    const thread = await this.commentQueryRepository.listBySubjectQuery(subjectType, subjectId)

    return thread.map((root) => ({
      ...ListCommentsQuery.redact(root),
      replies: root.replies.map((reply) => ListCommentsQuery.redact(reply)),
    }))
  }

  private static redact<T extends CommentDTO>(comment: T): T {
    return comment.deletedAt ? { ...comment, body: null } : comment
  }
}
