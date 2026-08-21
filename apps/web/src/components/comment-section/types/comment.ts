/**
 * Mirrors the backend's composed cross-context shape (apps/backend/src/comment/
 * comment.controller.ts) — the thread comes from the comment context, the name
 * and face of each author from auth, and no `@ctx/adapters` package owns the
 * result, so it is hand-copied here (same as ProfileStats).
 *
 * Dates arrive as ISO strings over the wire; `formatRelativeTime`/
 * `formatDateTime` take either.
 */
export interface CommentAuthorView {
  /** Nickname when there is one, else a truncated id — never an e-mail. */
  label: string
  avatarUrl: string | null
}

export interface CommentView {
  id: string
  parentId: string | null
  /** Compared with the logged-in user's id: only the author gets to edit it
   * or take it back. */
  authorId: string
  author: CommentAuthorView
  /** NULL = the author withdrew it. The backend never sends the text of a
   * withdrawn comment to a reader, so the tombstone is the only thing that can
   * be rendered here (the admin reads the original through the history route). */
  body: string | null
  createdAt: string
  /** Null = never edited. Non-null = the "editado" badge, shown to everyone. */
  editedAt: string | null
  /** Non-null = tombstone: the line and its replies stay, the text is gone. */
  deletedAt: string | null
}

export interface CommentThreadView extends CommentView {
  replies: CommentView[]
}
