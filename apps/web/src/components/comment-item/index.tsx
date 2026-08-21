'use client'

import type { CommentView } from '../comment-section/types/comment'
import { ParticipantAvatar } from '../participant-avatar'
import { ConfirmDialog } from '../confirm-dialog'
import { CommentComposer } from '../comment-composer'
import { formatDateTime, formatEditedAt, formatRelativeTime } from '@/lib/date'
import { useCommentItem } from './hooks/use-comment-item'

// Same pixel-art language as the sidebar icons and the bell: a 16x16 grid of
// rects. Red, and only ever rendered for an admin.
const TrashIcon = () => (
  <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor" aria-hidden="true">
    <rect x="6" y="1" width="4" height="1" />
    <rect x="2" y="3" width="12" height="2" />
    <rect x="4" y="6" width="8" height="9" />
  </svg>
)

interface CommentItemProps {
  comment: CommentView
  /** Only a ROOT passes replies — the thread is two levels deep. */
  replies?: CommentView[]
  /** What a "Responder" on this line answers: ALWAYS the root of the thread. */
  rootId: string
  isAdmin: boolean
  currentUserId: string | null
  onReply: (body: string, parentId: string) => void
  onEdit: (commentId: string, body: string) => void
  /** The AUTHOR taking their own comment back (soft delete). */
  onDeleteMine: (commentId: string) => void
  /** The ADMIN erasing it for good — a root takes its replies with it. */
  onDeletePermanently: (commentId: string) => void
  posting: boolean
  saving: boolean
  /**
   * Set on a REPLY: answering a reply has to open the root's box, because the
   * domain only accepts a root as a parent (see PostComment). Absent on a root,
   * which owns the box itself.
   */
  onRequestReply?: () => void
}

/**
 * One comment: the bubble, the actions under it and — on a root — its replies.
 *
 * It renders ITSELF for each reply (a two-level recursion the domain caps), so
 * a reply looks and behaves like a comment without a second component drifting
 * away from this one.
 */
export function CommentItem({
  comment,
  replies,
  rootId,
  isAdmin,
  currentUserId,
  onReply,
  onEdit,
  onDeleteMine,
  onDeletePermanently,
  posting,
  saving,
  onRequestReply,
}: CommentItemProps) {
  const {
    editing,
    startEditing,
    stopEditing,
    replying,
    startReplying,
    stopReplying,
    confirming,
    confirmDelete,
    cancelConfirm,
    historyOpen,
    toggleHistory,
    revisions,
    currentBody,
    loadingHistory,
  } = useCommentItem(comment.id, comment.editedAt !== null || comment.deletedAt !== null)

  const isRoot = comment.id === rootId
  const isDeleted = comment.deletedAt !== null
  const isMine = currentUserId !== null && currentUserId === comment.authorId
  const actionClass =
    'font-pixel text-[9px] tracking-wide text-arcade-text-muted transition-colors hover:text-arcade-cyan'

  return (
    <article className="flex gap-2.5 sm:gap-3">
      <ParticipantAvatar
        id={comment.authorId}
        name={comment.author.label}
        imageUrl={comment.author.avatarUrl}
        className={isRoot ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-8 w-8'}
        textClassName={isRoot ? 'text-[10px]' : 'text-[8px]'}
      />

      {/* min-w-0 is not decorative: without it this flex child's floor is its
          min-content width, and one long unbroken word in a comment would push
          the whole card past the edge of a phone screen. */}
      <div className="min-w-0 flex-1">
        <div className="border-3 border-arcade-border-strong bg-arcade-header px-3 py-2.5 sm:px-3.5">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="break-all font-pixel text-[10px] text-arcade-cyan">
              {comment.author.label}
            </span>
            <span
              className="font-arcade text-base text-arcade-text-muted"
              title={formatDateTime(comment.createdAt)}
            >
              {formatRelativeTime(comment.createdAt)}
            </span>
            {/* An edit badge on a tombstone tells the reader nothing — the text
                it refers to is not on screen any more. The admin still sees
                both the withdrawal and the revisions in the panel below. */}
            {comment.editedAt && !isDeleted && (
              // Everyone sees that a comment was rewritten, and when. Only the
              // admin gets to read what it said before (see below).
              <span
                className="font-arcade text-base text-arcade-amber"
                title={`Editado em ${formatDateTime(comment.editedAt)}`}
              >
                editado {formatEditedAt(comment.editedAt)}
              </span>
            )}
          </header>

          {isDeleted ? (
            // The text is not here to hide — the backend never sent it (see
            // ListCommentsQuery). The line stays so the replies under it keep
            // making sense.
            <p className="mt-1.5 font-arcade text-lg italic leading-snug text-arcade-text-muted">
              Comentário excluído pelo autor
            </p>
          ) : editing ? (
            <div className="mt-2.5">
              <CommentComposer
                // Never null in this branch (a withdrawn comment renders the
                // tombstone above and offers no edit), but the type says so.
                initialValue={comment.body ?? ''}
                submitLabel="Salvar"
                busy={saving}
                autoFocus
                onCancel={stopEditing}
                onSubmit={(body) => {
                  onEdit(comment.id, body)
                  stopEditing()
                }}
              />
            </div>
          ) : (
            // whitespace-pre-wrap keeps the line breaks the author typed;
            // break-words is what stops a pasted link from widening the card.
            <p className="mt-1.5 whitespace-pre-wrap break-words font-arcade text-lg leading-snug text-arcade-text">
              {comment.body}
            </p>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {/* Nothing to answer, edit or withdraw on a comment its author already
              took back — only the admin's tools stay. */}
          {!isDeleted && (
            <button
              type="button"
              className={actionClass}
              onClick={() => (onRequestReply ? onRequestReply() : startReplying())}
            >
              RESPONDER
            </button>
          )}
          {isMine && !isDeleted && !editing && (
            <button type="button" className={actionClass} onClick={startEditing}>
              EDITAR
            </button>
          )}
          {isMine && !isDeleted && (
            <button type="button" className={actionClass} onClick={() => confirmDelete('mine')}>
              EXCLUIR
            </button>
          )}
          {isAdmin && (comment.editedAt || isDeleted) && (
            <button type="button" className={actionClass} onClick={toggleHistory}>
              {historyOpen ? 'OCULTAR TEXTO' : isDeleted ? 'VER EXCLUÍDO' : 'VER ORIGINAL'}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => confirmDelete('permanent')}
              aria-label={`Excluir de vez o comentário de ${comment.author.label}`}
              title="Excluir de vez (apaga a linha e as respostas)"
              className="ml-auto flex items-center gap-1.5 font-pixel text-[9px] tracking-wide text-arcade-danger transition-opacity hover:opacity-70"
            >
              <TrashIcon />
              <span className="sr-only sm:not-sr-only">EXCLUIR DE VEZ</span>
            </button>
          )}
        </div>

        {isAdmin && historyOpen && (
          <div className="mt-2 border-3 border-arcade-amber bg-arcade-surface p-3">
            <p className="font-pixel text-[9px] tracking-widest text-arcade-amber">
              {isDeleted ? 'TEXTO EXCLUÍDO PELO AUTOR' : 'ANTES DA EDIÇÃO'}
            </p>
            {loadingHistory ? (
              <p className="mt-2 font-arcade text-base text-arcade-text-muted">Carregando…</p>
            ) : (
              <>
                {isDeleted && currentBody && (
                  // The soft delete's other half: the row kept its text, and
                  // this is the only place it is ever served.
                  <p className="mt-2 whitespace-pre-wrap break-words font-arcade text-lg text-arcade-text-soft">
                    {currentBody}
                  </p>
                )}
                {revisions.length > 0 && (
                  <p className="mt-3 font-pixel text-[9px] tracking-widest text-arcade-amber">
                    ANTES DA EDIÇÃO
                  </p>
                )}
              </>
            )}
            {!loadingHistory && revisions.length === 0 && !isDeleted ? (
              <p className="mt-2 font-arcade text-base text-arcade-text-muted">
                Nenhuma versão anterior registrada.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {revisions.map((revision) => (
                  <li key={revision.id} className="border-l-3 border-arcade-border-strong pl-2.5">
                    <span className="block font-arcade text-base text-arcade-text-muted">
                      {formatDateTime(revision.recordedAt)}
                    </span>
                    <span className="block whitespace-pre-wrap break-words font-arcade text-lg text-arcade-text-soft">
                      {revision.body}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* An explicit boolean, not `replies?.length && …`: an empty array
            yields 0, and React renders a 0 on the screen. */}
        {(replies !== undefined && replies.length > 0) || replying ? (
          <div className="mt-3 space-y-3 border-l-3 border-arcade-border-strong pl-2.5 sm:pl-4">
            {replies?.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                rootId={rootId}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onReply={onReply}
                onEdit={onEdit}
                onDeleteMine={onDeleteMine}
                onDeletePermanently={onDeletePermanently}
                posting={posting}
                saving={saving}
                // Answering a reply hangs off the ROOT, so it opens this
                // component's own box rather than one of its own.
                onRequestReply={startReplying}
              />
            ))}

            {replying && (
              <CommentComposer
                placeholder={`Responder ${comment.author.label}…`}
                submitLabel="Responder"
                busy={posting}
                autoFocus
                onCancel={stopReplying}
                onSubmit={(body) => {
                  onReply(body, rootId)
                  stopReplying()
                }}
              />
            )}
          </div>
        ) : null}

        {/* The author's own delete: says out loud what stays behind, because
            "excluir" that keeps the text somewhere has to be honest about it. */}
        <ConfirmDialog
          open={confirming === 'mine'}
          title="Excluir seu comentário?"
          description={
            replies?.length
              ? 'O texto sai da conversa para todo mundo. As respostas continuam onde estão, e o admin ainda consegue ver o que você tinha escrito.'
              : 'O texto sai da conversa para todo mundo. O admin ainda consegue ver o que você tinha escrito.'
          }
          confirmLabel="Excluir comentário"
          onConfirm={() => {
            onDeleteMine(comment.id)
            cancelConfirm()
          }}
          onCancel={cancelConfirm}
        />

        <ConfirmDialog
          open={confirming === 'permanent'}
          title="Excluir de vez este comentário?"
          description={
            replies?.length
              ? 'Apaga a linha do banco, junto com todas as respostas dela. Não dá pra desfazer nem consultar depois.'
              : 'Apaga a linha do banco. Não dá pra desfazer nem consultar depois.'
          }
          confirmLabel="Excluir de vez"
          onConfirm={() => {
            onDeletePermanently(comment.id)
            cancelConfirm()
          }}
          onCancel={cancelConfirm}
        />
      </div>
    </article>
  )
}
