'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CommentHistoryDTO } from '@comment/adapters'
import { api } from '@/lib/api'

/**
 * Which box is open on THIS line (edit, reply, the admin's history) — purely
 * local UI state, which is why it is not in useCommentSection along with the
 * writes.
 *
 * The history is fetched only once the admin actually asks for it: it is an
 * extra request per comment, and an unedited comment never has one to show.
 */
export function useCommentItem(commentId: string, wasEdited: boolean) {
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const history = useQuery({
    queryKey: ['comment-history', commentId],
    queryFn: async (): Promise<CommentHistoryDTO> =>
      (await api.get<CommentHistoryDTO>(`/comment/${commentId}/history`)).data,
    enabled: historyOpen && wasEdited,
  })

  return {
    editing,
    startEditing: () => {
      setReplying(false)
      setEditing(true)
    },
    stopEditing: () => setEditing(false),
    replying,
    startReplying: () => {
      setEditing(false)
      setReplying(true)
    },
    stopReplying: () => setReplying(false),
    confirmingDelete,
    setConfirmingDelete,
    historyOpen,
    toggleHistory: () => setHistoryOpen((open) => !open),
    revisions: history.data?.revisions ?? [],
    loadingHistory: history.isLoading,
  }
}
