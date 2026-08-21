import {
  CommentRepository,
  CommentQueryRepository,
  Comment,
  CommentRevision,
  CommentSubjectType,
  CommentThreadDTO,
  CommentHistoryDTO,
  CommentDTO,
} from '../../src'

interface CommentRow {
  id: string
  subjectType: CommentSubjectType
  subjectId: string
  authorId: string
  parentId: string | null
  body: string
  createdAt: Date
  editedAt: Date | null
}

interface RevisionRow {
  id: string
  commentId: string
  body: string
  recordedAt: Date
}

export default class CommentRepositoryInMemory
  implements CommentRepository, CommentQueryRepository
{
  readonly comments: CommentRow[] = []
  readonly revisions: RevisionRow[] = []

  async findById(id: string): Promise<Comment | null> {
    const row = this.comments.find((comment) => comment.id === id)
    return row ? this.toEntity(row) : null
  }

  async create(comment: Comment): Promise<void> {
    this.comments.push(this.toRow(comment))
  }

  async update(comment: Comment, revision: CommentRevision): Promise<void> {
    const row = this.comments.find((current) => current.id === comment.id.value)
    if (!row) return
    row.body = comment.body.value
    row.editedAt = comment.editedAt
    this.revisions.push({
      id: revision.id.value,
      commentId: revision.commentId,
      body: revision.body,
      recordedAt: revision.recordedAt,
    })
  }

  async deleteWithReplies(id: string): Promise<void> {
    const doomed = this.comments
      .filter((comment) => comment.id === id || comment.parentId === id)
      .map((comment) => comment.id)

    for (const commentId of doomed) {
      const index = this.comments.findIndex((comment) => comment.id === commentId)
      if (index >= 0) this.comments.splice(index, 1)
      for (let cursor = this.revisions.length - 1; cursor >= 0; cursor--) {
        if (this.revisions[cursor].commentId === commentId) this.revisions.splice(cursor, 1)
      }
    }
  }

  async listBySubjectQuery(
    subjectType: CommentSubjectType,
    subjectId: string,
  ): Promise<CommentThreadDTO[]> {
    const ofSubject = this.comments.filter(
      (comment) => comment.subjectType === subjectType && comment.subjectId === subjectId,
    )

    // Ties on createdAt fall back to INSERTION ORDER (later inserted = newer):
    // a test posts two comments inside the same millisecond, which a real
    // database never sees between two people typing.
    const newestFirst = (one: CommentRow, other: CommentRow) =>
      other.createdAt.getTime() - one.createdAt.getTime() ||
      this.comments.indexOf(other) - this.comments.indexOf(one)

    return ofSubject
      .filter((comment) => comment.parentId === null)
      .sort(newestFirst)
      .map((root) => ({
        ...this.toDTO(root),
        replies: ofSubject
          .filter((comment) => comment.parentId === root.id)
          .sort((one, other) => -newestFirst(one, other))
          .map((reply) => this.toDTO(reply)),
      }))
  }

  async findHistoryQuery(commentId: string): Promise<CommentHistoryDTO | null> {
    const row = this.comments.find((comment) => comment.id === commentId)
    if (!row) return null

    return {
      commentId: row.id,
      authorId: row.authorId,
      currentBody: row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      revisions: this.revisions
        .filter((revision) => revision.commentId === commentId)
        .sort((one, other) => one.recordedAt.getTime() - other.recordedAt.getTime())
        .map((revision) => ({ id: revision.id, body: revision.body, recordedAt: revision.recordedAt })),
    }
  }

  private toRow(comment: Comment): CommentRow {
    return {
      id: comment.id.value,
      subjectType: comment.subjectType,
      subjectId: comment.subjectId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      body: comment.body.value,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
    }
  }

  private toEntity(row: CommentRow): Comment {
    return new Comment({
      id: row.id,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      authorId: row.authorId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
    })
  }

  private toDTO(row: CommentRow): CommentDTO {
    return {
      id: row.id,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      authorId: row.authorId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
    }
  }
}
