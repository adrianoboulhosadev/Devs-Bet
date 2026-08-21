import { Injectable } from '@nestjs/common'
import {
  CommentRepository,
  CommentQueryRepository,
  Comment,
  CommentRevision,
  CommentSubjectType,
  CommentDTO,
  CommentThreadDTO,
  CommentHistoryDTO,
} from '@comment/adapters'
import { PrismaService } from '../db/prisma.service'

interface CommentRow {
  id: string
  subjectType: string
  subjectId: string
  authorId: string
  parentId: string | null
  body: string
  createdAt: Date
  editedAt: Date | null
}

@Injectable()
export class PrismaCommentRepository implements CommentRepository, CommentQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Comment | null> {
    const row = await this.prisma.comment.findUnique({ where: { id } })
    return row
      ? new Comment({
          id: row.id,
          subjectType: row.subjectType as CommentSubjectType,
          subjectId: row.subjectId,
          authorId: row.authorId,
          parentId: row.parentId,
          body: row.body,
          createdAt: row.createdAt,
          editedAt: row.editedAt,
        })
      : null
  }

  async create(comment: Comment): Promise<void> {
    await this.prisma.comment.create({
      data: {
        id: comment.id.value,
        subjectType: comment.subjectType,
        subjectId: comment.subjectId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        body: comment.body.value,
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
      },
    })
  }

  /** The new text and the record of the old one are ONE fact — a transaction is
   * what stops the history from losing a version if the second write fails. */
  async update(comment: Comment, revision: CommentRevision): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: comment.id.value },
        data: { body: comment.body.value, editedAt: comment.editedAt },
      }),
      this.prisma.commentRevision.create({
        data: {
          id: revision.id.value,
          commentId: revision.commentId,
          body: revision.body,
          recordedAt: revision.recordedAt,
        },
      }),
    ])
  }

  /** Replies are deleted EXPLICITLY rather than left to the schema's cascade:
   * the port promises the thread goes with its root, so the behaviour should be
   * readable here and not depend on a constraint two files away (the cascade
   * stays as the integrity backstop). */
  async deleteWithReplies(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { parentId: id } }),
      this.prisma.comment.delete({ where: { id } }),
    ])
  }

  async listBySubjectQuery(
    subjectType: CommentSubjectType,
    subjectId: string,
  ): Promise<CommentThreadDTO[]> {
    // One query for the whole thread (roots + replies), grouped here: a match
    // has tens of comments, not thousands, and two round trips would cost more
    // than the grouping does.
    const rows = await this.prisma.comment.findMany({
      where: { subjectType, subjectId },
      orderBy: { createdAt: 'asc' },
    })

    const repliesOf = new Map<string, CommentDTO[]>()
    for (const row of rows) {
      if (!row.parentId) continue
      const siblings = repliesOf.get(row.parentId) ?? []
      siblings.push(this.toDTO(row))
      repliesOf.set(row.parentId, siblings)
    }

    return rows
      .filter((row) => row.parentId === null)
      .reverse() // newest conversation on top; replies stay oldest-first inside it
      .map((root) => ({ ...this.toDTO(root), replies: repliesOf.get(root.id) ?? [] }))
  }

  async findHistoryQuery(commentId: string): Promise<CommentHistoryDTO | null> {
    const row = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { revisions: { orderBy: { recordedAt: 'asc' } } },
    })
    if (!row) return null

    return {
      commentId: row.id,
      authorId: row.authorId,
      currentBody: row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      revisions: row.revisions.map((revision) => ({
        id: revision.id,
        body: revision.body,
        recordedAt: revision.recordedAt,
      })),
    }
  }

  private toDTO(row: CommentRow): CommentDTO {
    return {
      id: row.id,
      subjectType: row.subjectType as CommentSubjectType,
      subjectId: row.subjectId,
      authorId: row.authorId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
    }
  }
}
