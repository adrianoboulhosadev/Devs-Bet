'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CommentSubjectType } from '@comment/adapters'
import type { CommentThreadView } from '../types/comment'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'

/** Every comment query lives under this prefix, so the SSE ping (see
 * useNotificationStream) can refresh an open thread with one invalidation. */
export const COMMENTS_KEY = ['comments']

/**
 * Data and writes for one match/tournament thread.
 *
 * ALL the mutations live here, not in the item: the three of them invalidate
 * the same query, and keeping them together is what lets `comment-item` stay
 * visual (its own hook only tracks which box is open on that line).
 */
export function useCommentSection(subjectType: CommentSubjectType, subjectId: string) {
  const queryClient = useQueryClient()
  const { user, isAdmin } = useAuth()
  const threadKey = [...COMMENTS_KEY, subjectType, subjectId]

  const thread = useQuery({
    queryKey: threadKey,
    queryFn: async (): Promise<CommentThreadView[]> =>
      (await api.get<CommentThreadView[]>(`/comment/${subjectType}/${subjectId}`)).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: threadKey })

  const post = useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      api.post('/comment', { subjectType, subjectId, body, parentId: parentId ?? null }),
    onSuccess: invalidate,
    onError: (failure) => notify.failure(failure, 'Não foi possível publicar o comentário.'),
  })

  const edit = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      api.patch(`/comment/${commentId}`, { body }),
    onSuccess: invalidate,
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar o comentário.'),
  })

  // The AUTHOR taking their own comment back: a soft delete, so the replies
  // under it stay in the thread (and the admin can still read what was said).
  const removeMine = useMutation({
    mutationFn: (commentId: string) => api.delete(`/comment/${commentId}`),
    onSuccess: () => {
      invalidate()
      notify.success('Comentário excluído.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível excluir o comentário.'),
  })

  // The ADMIN's bin: erases the row for good, and a root takes its replies with
  // it. A different route from the one above precisely so the two cannot be
  // confused (see the backend controller).
  const removePermanently = useMutation({
    mutationFn: (commentId: string) => api.delete(`/comment/${commentId}/permanent`),
    onSuccess: () => {
      invalidate()
      notify.success('Comentário excluído de vez.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível excluir o comentário.'),
  })

  const comments = thread.data ?? []

  return {
    comments,
    // Roots AND replies — the header counts the whole conversation, not the
    // number of threads in it.
    total: comments.reduce((count, root) => count + 1 + root.replies.length, 0),
    loading: thread.isLoading,
    isAdmin,
    currentUserId: user?.id ?? null,
    post: (body: string, parentId?: string | null) => post.mutate({ body, parentId }),
    posting: post.isPending,
    edit: (commentId: string, body: string) => edit.mutate({ commentId, body }),
    saving: edit.isPending,
    removeMine: (commentId: string) => removeMine.mutate(commentId),
    removePermanently: (commentId: string) => removePermanently.mutate(commentId),
  }
}
