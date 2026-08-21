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
  /** Compared with the logged-in user's id: only the author gets to edit. */
  authorId: string
  author: CommentAuthorView
  body: string
  createdAt: string
  /** Null = never edited. Non-null = the "editado" badge, shown to everyone. */
  editedAt: string | null
}

export interface CommentThreadView extends CommentView {
  replies: CommentView[]
}
