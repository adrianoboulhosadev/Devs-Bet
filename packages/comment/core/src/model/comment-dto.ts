import { CommentSubjectType } from './comment'

/** READ projection (CQRS) of one comment. `authorId` travels raw: naming the
 * person is the APP layer's job (it is the only side that may read `users`),
 * exactly like the payments panel labelling a bettor. */
export interface CommentDTO {
  id: string
  subjectType: CommentSubjectType
  subjectId: string
  authorId: string
  parentId: string | null
  /**
   * NULL means the author withdrew it: the text is REDACTED on the way out
   * (see ListCommentsQuery), never handed to a reader. That is what makes the
   * soft delete a real delete for everyone except the admin, who reads it
   * through the history endpoint — shipping the body next to a "deleted" flag
   * would leave the text one devtools tab away.
   */
  body: string | null
  createdAt: Date
  /** Null = never edited. Non-null = shown to everyone as "editado às …". */
  editedAt: Date | null
  /** Non-null = the tombstone in the thread. The replies stay where they are. */
  deletedAt: Date | null
}

/** A root comment with the replies hanging off it — the shape the screen
 * renders, built by the read side so the front never has to thread it. */
export interface CommentThreadDTO extends CommentDTO {
  replies: CommentDTO[]
}

/** One previous version, for the admin's history view. */
export interface CommentRevisionDTO {
  id: string
  body: string
  recordedAt: Date
}

/**
 * ADMIN-only audit view of a comment: what it says now plus every text it said
 * before, oldest first. This is the whole point of keeping revisions — an
 * edited comment is visibly edited to everyone, and the admin can still read
 * what was originally posted.
 */
export interface CommentHistoryDTO {
  commentId: string
  authorId: string
  /** ALWAYS the real text, never redacted — including a comment the author
   * withdrew. This endpoint is admin-only, and reading what somebody said and
   * then took back is the entire point of the soft delete. */
  currentBody: string
  createdAt: Date
  editedAt: Date | null
  deletedAt: Date | null
  revisions: CommentRevisionDTO[]
}
