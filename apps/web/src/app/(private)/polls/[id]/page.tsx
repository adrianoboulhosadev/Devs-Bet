'use client'

import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { colorForId } from '@/lib/participant-colors'
import { OddsHistoryChart } from '@/components/odds-history-chart'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CommentSection } from '@/components/comment-section'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useBetSlip } from '@/contexts/bet-slip-context'
import { usePollDetail } from './hooks/use-poll-detail'

export default function PollDetailPage({ params }: { params: { id: string } }) {
  const pollId = params.id
  const {
    poll,
    odds,
    oddsHistory,
    book,
    loading,
    isAdmin,
    isOpen,
    marketClosed,
    pathOf,
    close,
    resolve,
    resolving,
    cancel,
    pendingWinner,
    setPendingWinner,
    confirmingCancel,
    setConfirmingCancel,
    isEditing,
    startEdit,
    cancelEdit,
    editForm,
    onEditSubmit,
    saving,
  } = usePollDetail(pollId)
  const { isSelfExcluded } = useSelfExclusion()
  const { toggle, has } = useBetSlip()

  if (loading || !poll) return <Loading />

  const optionLabel = (optionId: string) =>
    poll.options.find((option) => option.id === optionId)?.label ?? '—'
  const poolOf = (optionId: string) => odds?.entries.find((entry) => entry.selectionId === optionId)
  const totalPool = odds?.totalPool ?? 0
  const winnerLabel = poll.winningOptionId ? optionLabel(poll.winningOptionId) : null

  return (
    <div className="animate-scrIn space-y-6">
      <div className="relative overflow-hidden border-3 border-arcade-border bg-gradient-to-br from-[#2a1150] to-arcade-header p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
            {pathOf(poll.categoryId).toUpperCase()}
          </span>
          <StatusBadge status={poll.status} />
        </div>

        {poll.imageUrl && (
          // 16:9 — exactly the cropper's banner preset — so nothing is cut off at
          // any width (same framing rule as the match hero).
          <div className="-mx-6 mb-6 aspect-video border-y-3 border-arcade-border sm:mx-auto sm:w-full sm:max-w-3xl sm:border-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(poll.imageUrl)} alt={poll.question} className="h-full w-full object-cover" />
          </div>
        )}

        <h1 className="text-center text-3xl leading-tight text-arcade-text">{poll.question}</h1>
        <p className="mt-4 text-center font-pixel text-sm text-arcade-amber">
          {marketClosed ? 'Apostas encerradas' : `Apostas até ${formatDateTime(poll.closesAt)}`}
        </p>
      </div>

      {/* The written criterion, always visible: it is what the settlement can be
          argued against, so hiding it behind a toggle would defeat the point. */}
      <div className="border-3 border-arcade-cyan bg-arcade-surface p-4 shadow-pixel">
        <h2 className="mb-2 font-pixel text-[10px] tracking-widest text-arcade-cyan">COMO VAI SER JULGADA</h2>
        <p className="whitespace-pre-line font-arcade text-lg leading-snug text-arcade-text-soft">
          {poll.resolutionCriteria}
        </p>
      </div>

      {poll.status === 'settled' && (
        <p className="flex flex-wrap items-center gap-3 border-3 border-arcade-lime bg-arcade-surface px-4 py-3 font-arcade text-xl text-arcade-lime">
          Resposta: <span>{winnerLabel ?? '—'}</span>
        </p>
      )}

      {/* Mesma montagem da tela de partida: odds e histórico dividem a linha (o
          grid iguala a altura dos dois) e o livro de apostas ocupa a largura
          inteira embaixo, sem sobrar vazio ao lado. */}
      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
          <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3.5">
            <span className="font-pixel text-[10px] tracking-widest text-arcade-lime">
              {marketClosed ? 'ODDS FINAIS' : 'ODDS AO VIVO'}
            </span>
            <span className="font-arcade text-lg text-arcade-text-muted">pool total {formatBRL(totalPool)}</span>
          </div>
          {poll.options.map((option) => {
            const line = poolOf(option.id)
            const pct = totalPool > 0 ? Math.round(((line?.pool ?? 0) / totalPool) * 100) : 0
            const picked = has(poll.id, option.id)
            const clickable = isOpen && !isSelfExcluded
            const color = colorForId(option.id)
            const isAnswer = poll.winningOptionId === option.id

            const content = (
              <span className="flex flex-wrap items-center gap-3.5">
                <span className="min-w-[120px] flex-1">
                  <span className="block text-2xl leading-tight text-arcade-text">
                    {option.label}
                    {isAnswer && <span className="ml-2 font-arcade text-lg text-arcade-lime">✓</span>}
                  </span>
                  <span className="mt-1.5 block h-2 bg-[#0b0714]">
                    <span className="block h-full transition-all" style={{ backgroundColor: color, width: `${pct}%` }} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-3xl leading-none text-arcade-text">
                    {line?.impliedOdd ? `${line.impliedOdd}x` : '—'}
                  </span>
                  <span className="block font-arcade text-lg text-arcade-text-muted">{formatBRL(line?.pool ?? 0)}</span>
                </span>
              </span>
            )

            return clickable ? (
              <button
                key={option.id}
                type="button"
                aria-pressed={picked}
                onClick={() =>
                  toggle({
                    marketType: 'poll',
                    marketId: poll.id,
                    selectionId: option.id,
                    marketLabel: poll.question,
                    selectionLabel: option.label,
                  })
                }
                className={`block w-full border-b border-arcade-border-strong px-4 py-4 text-left transition-colors hover:bg-[#1d1233] ${
                  picked ? 'bg-[#2a1150]' : ''
                }`}
              >
                {content}
              </button>
            ) : (
              <div key={option.id} className="border-b border-arcade-border-strong px-4 py-4">
                {content}
              </div>
            )
          })}
          <p className="px-4 py-3.5 font-arcade text-lg text-arcade-text-muted">
            {isSelfExcluded
              ? 'Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.'
              : isOpen
                ? 'clica numa opção pra montar sua aposta · odd parimutuel, muda conforme a galera aposta'
                : poll.status === 'closed'
                  ? 'apostas fechadas — esperando a resposta aparecer'
                  : 'mercado fechado — mostrando o pool final'}
          </p>
        </div>

        <div className="border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel-lg">
          <h2 className="mb-4 font-pixel text-[10px] tracking-widest text-arcade-cyan">HISTÓRICO DAS ODDS</h2>
          <OddsHistoryChart snapshots={oddsHistory} selectionLabel={optionLabel} />
        </div>

        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel lg:col-span-2">
          <h2 className="border-b-3 border-arcade-border-strong px-4 py-3 font-pixel text-[10px] tracking-widest text-arcade-amber">
            QUEM JÁ ENTROU ({book.length})
          </h2>
          {book.length === 0 ? (
            <p className="px-4 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma aposta ainda.</p>
          ) : (
            book.map((bet) => (
              <div key={bet.id} className="flex items-center gap-3 border-b border-arcade-border-strong px-4 py-3">
                <span className="min-w-0 flex-1 font-arcade text-lg text-arcade-text-soft">
                  <span className="text-arcade-text-muted">{bet.bettorLabel}</span> em{' '}
                  <span className="text-arcade-text">{optionLabel(bet.selectionId)}</span>
                </span>
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-xl text-arcade-lime">{formatBRL(bet.stake)}</span>
                  <StatusBadge status={bet.status} />
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && poll.status !== 'settled' && poll.status !== 'cancelled' && (
        <div className="space-y-4 border-3 border-arcade-amber bg-arcade-surface p-5 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-widest text-arcade-amber">SALA DE CONTROLE</h2>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            {poll.status === 'open' && (
              <Button variant="warning" onClick={close}>
                Fechar apostas
              </Button>
            )}
            {poll.status === 'open' && !isEditing && (
              <Button variant="secondary" onClick={startEdit}>
                Mudar prazo
              </Button>
            )}
            {poll.status === 'closed' && (
              <span className="w-full font-arcade text-lg text-arcade-text-muted">
                Qual opção estava certa?
              </span>
            )}
            {poll.status === 'closed' &&
              poll.options.map((option) => (
                <Button key={option.id} variant="warning" onClick={() => setPendingWinner(option.id)}>
                  {option.label}
                </Button>
              ))}
            <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancelar enquete
            </Button>
          </div>

          {poll.status === 'open' && isEditing && (
            <form onSubmit={onEditSubmit} className="space-y-3.5 border-3 border-arcade-border-strong bg-arcade-header p-4">
              <h3 className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">MUDAR O PRAZO</h3>
              <Field label="APOSTAS ATÉ" type="datetime-local" required {...editForm.register('closesAt')} />
              <p className="font-arcade text-base leading-snug text-arcade-text-muted">
                A pergunta, o critério e as opções não mudam — é o combinado de quem já apostou.
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button type="submit" variant="warning" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancelar edição
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Always the LAST section of the page (see the match/tournament pages). */}
      <CommentSection subjectType="poll" subjectId={poll.id} />

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancelar a enquete?"
        description="Todas as apostas abertas são estornadas para as carteiras. Não dá pra desfazer."
        confirmLabel="Cancelar enquete"
        onConfirm={() => {
          cancel()
          setConfirmingCancel(false)
        }}
        onCancel={() => setConfirmingCancel(false)}
      />

      <ConfirmDialog
        open={pendingWinner !== null}
        title="Registrar a resposta"
        description={`"${pendingWinner ? optionLabel(pendingWinner) : ''}" vira a opção vencedora e as apostas são pagas. Não dá pra desfazer.`}
        confirmLabel={resolving ? 'Registrando…' : 'Registrar resposta'}
        confirmDisabled={resolving}
        onConfirm={() => {
          if (pendingWinner) resolve(pendingWinner)
          setPendingWinner(null)
        }}
        onCancel={() => setPendingWinner(null)}
      />
    </div>
  )
}
