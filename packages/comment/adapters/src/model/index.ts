// Rich entities re-exported as VALUES: the app's Prisma repository reconstitutes
// them (`new Comment({...})`) without importing @comment/core. CommentReplied is
// a value too — the backend's listener needs the CLASS for `instanceof`, not the
// type. Adapters is the context's only public surface.
export { Comment, CommentBody, CommentRevision, CommentReplied } from '@comment/core'
