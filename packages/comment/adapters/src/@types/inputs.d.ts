import { CommentSubjectType } from '@comment/core'

export interface PostCommentInput {
  subjectType: CommentSubjectType
  subjectId: string
  body: string
  /** The ROOT comment being answered. Absent/null = a new root comment. */
  parentId?: string | null
}

export interface EditCommentInput {
  body: string
}
