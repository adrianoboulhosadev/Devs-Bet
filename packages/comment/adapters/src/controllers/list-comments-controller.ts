import {
  ListCommentsQuery,
  CommentQueryRepository,
  CommentSubjectType,
  CommentThreadDTO,
} from '@comment/core'

export default class ListCommentsController {
  constructor(private readonly commentQueryRepository: CommentQueryRepository) {}

  async execute(subjectType: CommentSubjectType, subjectId: string): Promise<CommentThreadDTO[]> {
    return new ListCommentsQuery(this.commentQueryRepository).execute({ subjectType, subjectId })
  }
}
