'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CommentHistoryDTO } from '@comment/adapters'
import { api } from '@/lib/api'

/**
 * Which box is open on THIS line (edit, reply, the admin's history, which
 * delete is being confirmed) — purely local UI state, which is why it is not in
 * useCommentSection along with the writes.
 *
 * The history is fetched only once the admin actually asks for it: it is an
 * extra request per comment, and a comment that was never edited nor withdrawn
 * has nothing to show.
 */
export function useCommentItem(commentId: string, hasHistory: boolean) {
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  // WHICH delete is being confirmed: the author taking their own comment back
  // ('mine', soft) or the admin erasing it for good ('permanent'). One piece of
  // state instead of two booleans, because the two dialogs are exclusive.
  const [confirming, setConfirming] = useState<'mine' | 'permanent' | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const history = useQuery({
    queryKey: ['comment-history', commentId],
    queryFn: async (): Promise<CommentHistoryDTO> =>
      (await api.get<CommentHistoryDTO>(`/comment/${commentId}/history`)).data,
    enabled: historyOpen && hasHistory,
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
    confirming,
    confirmDelete: (which: 'mine' | 'permanent') => setConfirming(which),
    cancelConfirm: () => setConfirming(null),
    historyOpen,
    toggleHistory: () => setHistoryOpen((open) => !open),
    revisions: history.data?.revisions ?? [],
    /** The text as it stood when it was edited or withdrawn — admin only. */
    currentBody: history.data?.currentBody ?? null,
    loadingHistory: history.isLoading,
  }
}
