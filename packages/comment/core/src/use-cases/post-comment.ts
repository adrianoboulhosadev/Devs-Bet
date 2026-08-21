import { UseCase, EventPublisher, NotFoundError, ValidationError, Errors } from 'shared'
import { Comment, CommentSubjectType, CommentReplied } from '../model'
import { CommentRepository } from '../providers'

interface Input {
  subjectType: CommentSubjectType
  subjectId: string
  /** Resolved from the JWT at the HTTP boundary — never from the body (anti-IDOR). */
  authorId: string
  /** The ROOT comment being answered, when this is a reply. */
  parentId?: string | null
  body: string
  /**
   * Does the match/tournament/poll exist? Resolved CROSS-CONTEXT by the backend and
   * handed over as plain data — comment never imports those contexts, the
   * same shape as `categoryIsLeaf` in CreateMatch.
   */
  subjectExists: boolean
}

/**
 * Posts a comment, or a reply to one. Any authenticated bettor may comment;
 * there is nothing to gate here — this is the room's conversation, not a bet.
 *
 * The reply notification is raised HERE and not by the entity because it is a
 * creation event (see CommentReplied). Answering YOURSELF raises nothing: the
 * event exists to tell someone their comment got an answer, and nobody needs an
 * inbox line about their own typing.
 */
export default class PostComment implements UseCase<Input, void> {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: Input): Promise<void> {
    if (!input.subjectExists) {
      NotFoundError.throwError(Errors.COMMENT_SUBJECT_NOT_FOUND, input.subjectId)
    }

    const parent = input.parentId ? await this.load(input.parentId) : null
    if (parent?.isDeleted) {
      // The author took it back, so there is nothing left to answer. What was
      // already said under it stays on screen — that is the whole point of the
      // soft delete.
      ValidationError.throwError(Errors.COMMENT_DELETED, input.parentId)
    }
    if (parent && !parent.canBeRepliedFrom(input.subjectType, input.subjectId)) {
      // Either a reply to a reply (the thread is two levels deep) or a parent
      // from another match/tournament — a hand-crafted request, not a form.
      ValidationError.throwError(Errors.INVALID_COMMENT_PARENT, input.parentId)
    }

    const comment = new Comment({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      authorId: input.authorId,
      parentId: parent ? parent.id.value : null,
      body: input.body,
    })

    await this.commentRepository.create(comment)

    if (!parent || parent.authorId === comment.authorId) return
    await this.eventPublisher?.publish([
      new CommentReplied(
        comment.id.value,
        comment.authorId,
        parent.id.value,
        parent.authorId,
        comment.subjectType,
        comment.subjectId,
        comment.body.preview,
      ),
    ])
  }

  private async load(commentId: string): Promise<Comment> {
    const parent = await this.commentRepository.findById(commentId)
    if (!parent) NotFoundError.throwError(Errors.COMMENT_NOT_FOUND, commentId)
    return parent!
  }
}
