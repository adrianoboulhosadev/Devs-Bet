import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import {
  CommentFacade,
  CommentDTO,
  CommentHistoryDTO,
  CommentSubjectType,
  PostCommentInput,
  EditCommentInput,
} from '@comment/adapters'
import { UserDTO } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaCommentRepository } from './prisma-comment-repository'
import { CommentAuthors, CommentAuthorView } from './comment-authors'
import { PrismaService } from '../db/prisma.service'
import { DomainEventListener } from '../notification/domain-event-listener'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

/**
 * Composed cross-context read model (comment + auth): the thread plus a name
 * and a face for each author. No single context owns this shape — comment
 * knows no identities and auth knows no comments — so it is assembled here in
 * the app layer, the same reasoning `/user/me/profile` uses. The front
 * hand-mirrors it.
 *
 * `authorId` travels alongside the label because the screen needs it: only the
 * author gets an edit button on their own line.
 */
interface CommentView {
  id: string
  parentId: string | null
  authorId: string
  author: CommentAuthorView
  /** Null when the author withdrew it — the text never leaves the server for a
   * regular reader (see ListCommentsQuery). The screen shows a tombstone. */
  body: string | null
  createdAt: Date
  editedAt: Date | null
  deletedAt: Date | null
}

interface CommentThreadView extends CommentView {
  replies: CommentView[]
}

// Protected by the AuthMiddleware (see comment.module). Reading and posting are
// open to any authenticated user — this is the room's conversation. Deleting a
// comment and reading its edit history are admin-only (moderation), enforced by
// the AdminGuard here and by the AdminUseCase in the domain.
@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentRepository: PrismaCommentRepository,
    private readonly authors: CommentAuthors,
    private readonly prisma: PrismaService,
    private readonly events: DomainEventListener,
  ) {}

  private facade(): CommentFacade {
    return new CommentFacade(this.commentRepository, this.commentRepository, this.events)
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  @Get('match/:id')
  matchThread(@Param('id') id: string): Promise<CommentThreadView[]> {
    return this.thread('match', id)
  }

  @Get('tournament/:id')
  tournamentThread(@Param('id') id: string): Promise<CommentThreadView[]> {
    return this.thread('tournament', id)
  }

  // The author ALWAYS comes from the token (anti-IDOR), never from the body.
  @Post()
  @HttpCode(201)
  async post(@Body() input: PostCommentInput, @authenticatedUser() user: UserDTO) {
    const subjectExists = await this.subjectExists(input.subjectType, input.subjectId)
    await this.facade().postComment(input, user.id, subjectExists)
  }

  @Patch(':id')
  @HttpCode(204)
  async edit(
    @Param('id') id: string,
    @Body() input: EditCommentInput,
    @authenticatedUser() user: UserDTO,
  ) {
    await this.facade().editComment(id, input, user.id)
  }

  // The author taking their own comment back: a SOFT delete, so the replies
  // under it survive and the admin can still read what was said.
  @Delete(':id')
  @HttpCode(204)
  async removeMine(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().deleteMyComment(id, user.id)
  }

  // Moderation: the red bin on every comment, for the owner of the room. This
  // one really erases the row (and a root's replies with it) — declared on its
  // own path so the two deletes can never be confused for each other.
  @Delete(':id/permanent')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().deleteComment(id, this.actor(user))
  }

  // The other half of the "editado" badge: everyone sees a comment was
  // rewritten, the admin can see what it said before.
  @Get(':id/history')
  @UseGuards(AdminGuard)
  history(@Param('id') id: string, @authenticatedUser() user: UserDTO): Promise<CommentHistoryDTO> {
    return this.facade().getCommentHistory(id, this.actor(user))
  }

  private async thread(
    subjectType: CommentSubjectType,
    subjectId: string,
  ): Promise<CommentThreadView[]> {
    const roots = await this.facade().listComments(subjectType, subjectId)
    const authorIds = roots.flatMap((root) => [
      root.authorId,
      ...root.replies.map((reply) => reply.authorId),
    ])
    const authors = await this.authors.viewsFor(authorIds)

    return roots.map((root) => ({
      ...this.toView(root, authors),
      replies: root.replies.map((reply) => this.toView(reply, authors)),
    }))
  }

  private toView(comment: CommentDTO, authors: Map<string, CommentAuthorView>): CommentView {
    return {
      id: comment.id,
      parentId: comment.parentId,
      authorId: comment.authorId,
      author: authors.get(comment.authorId) ?? { label: comment.authorId.slice(0, 8), avatarUrl: null },
      body: comment.body,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      deletedAt: comment.deletedAt,
    }
  }

  /**
   * Cross-context: does the match/tournament being commented on exist? Resolved
   * here and handed to the use case as plain data — comment never imports
   * either context, the same pattern as `categoryIsLeaf` in CreateMatch.
   */
  private async subjectExists(subjectType: CommentSubjectType, subjectId: string): Promise<boolean> {
    if (subjectType === 'match') {
      return (await this.prisma.match.count({ where: { id: subjectId } })) > 0
    }
    if (subjectType === 'tournament') {
      return (await this.prisma.tournament.count({ where: { id: subjectId } })) > 0
    }
    // An unknown subjectType never names anything that exists — the use case
    // turns that into COMMENT_SUBJECT_NOT_FOUND, and the entity would reject it
    // right after.
    return false
  }
}
