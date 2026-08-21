import { UseCase } from 'shared'
import { CommentSubjectType, CommentThreadDTO } from '../model'
import { CommentQueryRepository } from '../providers'

interface Input {
  subjectType: CommentSubjectType
  subjectId: string
}

/** The comment thread of one match/tournament, open to any authenticated user
 * — the conversation is the room's, not private. Read side: plain DTOs. */
export default class ListCommentsQuery implements UseCase<Input, CommentThreadDTO[]> {
  constructor(private readonly commentQueryRepository: CommentQueryRepository) {}

  async execute({ subjectType, subjectId }: Input): Promise<CommentThreadDTO[]> {
    return this.commentQueryRepository.listBySubjectQuery(subjectType, subjectId)
  }
}
