'use client'

import type { CommentSubjectType } from '@comment/adapters'
import { Loading } from '../loading'
import { CommentItem } from '../comment-item'
import { CommentComposer } from '../comment-composer'
import { useCommentSection } from './hooks/use-comment-section'

interface CommentSectionProps {
  subjectType: CommentSubjectType
  subjectId: string
}

/**
 * The conversation at the bottom of a match/tournament page — the LAST section
 * of both screens. One component for the two of them: the thread only ever
 * differs by which subject it hangs off.
 */
export function CommentSection({ subjectType, subjectId }: CommentSectionProps) {
  const {
    comments,
    total,
    loading,
    isAdmin,
    currentUserId,
    post,
    posting,
    edit,
    saving,
    removeMine,
    removePermanently,
  } = useCommentSection(subjectType, subjectId)

  return (
    <section className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-3 border-arcade-border-strong px-4 py-3.5">
        <h2 className="font-pixel text-[10px] tracking-widest text-arcade-purple">
          COMENTÁRIOS ({total})
        </h2>
        <p className="font-arcade text-lg text-arcade-text-muted">
          {subjectType === 'match' ? 'comenta aí sobre a partida' : 'comenta aí sobre o torneio'}
        </p>
      </div>

      <div className="border-b border-arcade-border-strong p-4">
        <CommentComposer onSubmit={(body) => post(body)} submitLabel="Comentar" busy={posting} />
      </div>

      {loading ? (
        <Loading compact />
      ) : comments.length === 0 ? (
        <p className="px-4 py-6 font-arcade text-lg text-arcade-text-muted">
          Ninguém falou nada ainda. Seja o primeiro.
        </p>
      ) : (
        <div className="divide-y divide-arcade-border-strong">
          {comments.map((root) => (
            <div key={root.id} className="px-3 py-4 sm:px-4">
              <CommentItem
                comment={root}
                replies={root.replies}
                rootId={root.id}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onReply={(body, parentId) => post(body, parentId)}
                onEdit={edit}
                onDeleteMine={removeMine}
                onDeletePermanently={removePermanently}
                posting={posting}
                saving={saving}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
