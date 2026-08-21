import { Comment, CommentRevision } from '../model'

/**
 * Comment WRITE port (command side).
 *
 * `update` takes the comment AND the revision it produced because the two are
 * ONE fact: the previous text must never be able to vanish while the new one
 * lands (or the other way around). The port exposes the composed operation and
 * the adapter wraps it in a transaction — the same split money moves already
 * use (see BettingRepository.placeBet).
 */
export interface CommentRepository {
  findById(id: string): Promise<Comment | null>
  create(comment: Comment): Promise<void>
  /** Applies the edit and appends the revision in a SINGLE commit. */
  update(comment: Comment, revision: CommentRevision): Promise<void>
  /** Removes the comment and, when it is a root, its whole reply thread —
   * leaving replies pointing at a parent that no longer exists would strand
   * them on screen with nothing to attach to. */
  deleteWithReplies(id: string): Promise<void>
}
