'use client'

import { useState } from 'react'
import { Button } from '@/components/button'
import { Field } from '@/components/field'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { colorForId } from '@/lib/participant-colors'
import { CategoryPicker } from '@/components/category-picker'
import { OddsHistoryChart } from '@/components/odds-history-chart'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { CommentSection } from '@/components/comment-section'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useBetSlip } from '@/contexts/bet-slip-context'
import { useMatchDetail } from './hooks/use-match-detail'
import { MATCH_DRAW_SELECTION_ID } from '@/data/match-selections'

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const matchId = params.id
  const {
    match,
    odds,
    oddsHistory,
    book,
    loading,
    isAdmin,
    isOpen,
    marketClosed,
    lock,
    recordUnitResult,
    recordingUnitResult,
    cancel,
    isEditing,
    startEdit,
    cancelEdit,
    editForm,
    onEditSubmit,
    saving,
    categories,
    pathOf,
    confirmingCancel,
    setConfirmingCancel,
  } = useMatchDetail(matchId)
  const { isSelfExcluded } = useSelfExclusion()
  const { toggle, has } = useBetSlip()
  // Declaring a unit's result requires a proof photo — staged here until the
  // admin attaches one and confirms (see MatchUnit.proofImageUrl).
  const [pendingResult, setPendingResult] = useState<{ winnerParticipantId: string | null; file: File | null } | null>(
    null,
  )

  if (loading || !match) return <Loading />

  // Betting selections for a match: its participants plus the draw pseudo-selection
  // (only when this match allows a draw — e.g. never for a tournament confrontation).
  const selections = [
    ...match.participants.map((participant) => ({
      id: participant.id,
      label: participant.displayName,
      participantId: participant.participantId as string | null,
      imageUrl: participant.imageUrl,
      color: colorForId(participant.participantId),
    })),
    ...(match.allowsDraw
      ? [{ id: MATCH_DRAW_SELECTION_ID, label: 'Empate', participantId: null, imageUrl: null, color: '#8b7bb8' }]
      : []),
  ]
  const selectionLabel = (selectionId: string) =>
    selections.find((selection) => selection.id === selectionId)?.label ?? '—'
  const poolOf = (selectionId: string) => odds?.entries.find((entry) => entry.selectionId === selectionId)
  const winnerName = match.participants.find((p) => p.id === match.winnerParticipantId)?.displayName
  const totalPool = odds?.totalPool ?? 0

  // bestOf > 1: how many units each participant has already won, and the next
  // unit's number (1-based) — the admin declares one unit at a time.
  const unitWinsOf = (participantId: string) =>
    match.units.filter((unit) => unit.winnerParticipantId === participantId).length
  const nextUnitNumber = match.units.length + 1
  const [p1, p2] = match.participants

  // "renan nascimento vs adriano boulhosa" e "Renan Nascimento X Adriano
  // Boulhosa" são o MESMO texto pra quem lê: o separador e a caixa não contam.
  const asComparable = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()
  const namesJoinedBy = (separator: string) =>
    match.participants.map((participant) => participant.displayName).join(separator)
  const titleRepeatsParticipants = [' vs ', ' x ', ' × ', ' vs. '].some(
    (separator) => asComparable(match.title) === asComparable(namesJoinedBy(separator)),
  )

  return (
    <div className="animate-scrIn space-y-6">
      <div className="relative overflow-hidden border-3 border-arcade-border bg-gradient-to-br from-[#2a1150] to-arcade-header p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
            {pathOf(match.categoryId).toUpperCase()}
          </span>
          <StatusBadge status={match.status} />
        </div>

        {match.imageUrl && (
          // 16:9 — exactly the cropper's banner preset — so NOTHING is cut off,
          // at any width. A fixed height was what cropped it: on a wide screen
          // the box became ~4.4:1 and object-cover ate the top and bottom of
          // the frame the admin had chosen. Width is capped (and centred)
          // instead of height, because full-width 16:9 on a desktop would be
          // ~700px tall and push the participants off the screen.
          // On a phone it runs to the card's edge (`-mx-6` cancels the p-6) to
          // win back the width the padding would eat; from `sm` up it centres
          // and caps instead.
          <div className="-mx-6 mb-6 aspect-video border-y-3 border-arcade-border sm:mx-auto sm:w-full sm:max-w-3xl sm:border-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(match.imageUrl)} alt={match.title} className="h-full w-full object-cover" />
          </div>
        )}

        {/* Dois estados e SÓ dois: empilhado, ou os três lado a lado. Nada de
            `flex-wrap` — era ele que produzia o meio-termo torto (nome + fotos
            numa linha e o segundo nome sozinho embaixo, cada um alinhado pro
            lado errado). O corte é em `lg` porque a linha precisa de ~590px só
            de conteúdo: abaixo disso ela cabe apertada, não bem. Empilhado,
            cada nome alinha pro lado do próprio avatar. */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-5">
          <div className="min-w-0 text-left lg:flex-1 lg:basis-40 lg:text-right">
            <p className="text-3xl leading-tight text-arcade-text">{p1?.displayName}</p>
            <p className="font-arcade text-lg text-arcade-text-muted">
              {unitWinsOf(p1?.id ?? '')} unidade{unitWinsOf(p1?.id ?? '') === 1 ? '' : 's'} vencida
              {unitWinsOf(p1?.id ?? '') === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-none items-center justify-center gap-4">
            {p1 ? (
              <ParticipantAvatar
                id={p1.participantId}
                name={p1.displayName}
                imageUrl={p1.imageUrl}
                className="h-[86px] w-[86px] shadow-pixel"
                textClassName="text-lg"
              />
            ) : (
              <span className="h-[86px] w-[86px] flex-none bg-[#8b7bb8] shadow-pixel" />
            )}
            <span className="font-pixel text-xl text-arcade-magenta [text-shadow:0_0_18px_rgba(255,61,129,.7)]">VS</span>
            {p2 ? (
              <ParticipantAvatar
                id={p2.participantId}
                name={p2.displayName}
                imageUrl={p2.imageUrl}
                className="h-[86px] w-[86px] shadow-pixel"
                textClassName="text-lg"
              />
            ) : (
              <span className="h-[86px] w-[86px] flex-none bg-[#8b7bb8] shadow-pixel" />
            )}
          </div>
          <div className="min-w-0 text-right lg:flex-1 lg:basis-40 lg:text-left">
            <p className="text-3xl leading-tight text-arcade-text">{p2?.displayName}</p>
            <p className="font-arcade text-lg text-arcade-text-muted">
              {unitWinsOf(p2?.id ?? '')} unidade{unitWinsOf(p2?.id ?? '') === 1 ? '' : 's'} vencida
              {unitWinsOf(p2?.id ?? '') === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-center">
          {/* Um confronto de torneio nasce com o título "A vs B" — os mesmos dois
              nomes que já estão logo acima, em corpo maior e com as fotos. Aí a
              linha só repete; quando o título diz outra coisa ("Boxing Match"),
              ela informa e fica. */}
          {!titleRepeatsParticipants && (
            <span className="font-arcade text-xl text-arcade-text-soft">{match.title}</span>
          )}
          <span className="font-pixel text-sm text-arcade-amber">{formatDateTime(match.scheduledAt)}</span>
        </div>
      </div>

      {match.status === 'settled' && (
        <p className="flex flex-wrap items-center gap-3 border-3 border-arcade-lime bg-arcade-surface px-4 py-3 font-arcade text-xl text-arcade-lime">
          {match.winnerParticipantId === null ? (
            <span>Empate</span>
          ) : (
            <>
              Vencedor: <span>{winnerName ?? '—'}</span>
            </>
          )}
          {match.units[match.units.length - 1]?.proofImageUrl && (
            <a
              href={mediaUrl(match.units[match.units.length - 1].proofImageUrl!)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-arcade-cyan underline"
            >
              ver comprovante
            </a>
          )}
        </p>
      )}

      {/* Os cards são itens DIRETOS do grid, não dois blocos empilhados numa
          coluna cada: assim "odds ao vivo" e "histórico das odds" dividem a
          mesma linha e o grid iguala a altura dos dois (antes o histórico
          sobrava porque cada coluna crescia sozinha). O que vem depois ocupa a
          largura inteira, em vez de deixar um buraco embaixo das odds. */}
      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
          <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3.5">
            <span className="font-pixel text-[10px] tracking-widest text-arcade-lime">
              {marketClosed ? 'ODDS FINAIS' : 'ODDS AO VIVO'}
            </span>
            <span className="font-arcade text-lg text-arcade-text-muted">pool total {formatBRL(totalPool)}</span>
          </div>
          {selections.map((selection) => {
            const line = poolOf(selection.id)
            const pct = totalPool > 0 ? Math.round(((line?.pool ?? 0) / totalPool) * 100) : 0
            const picked = has(match.id, selection.id)
            const clickable = isOpen && !isSelfExcluded

            const content = (
              <span className="flex flex-wrap items-center gap-3.5">
                <ParticipantAvatar
                  id={selection.participantId ?? selection.id}
                  name={selection.label}
                  imageUrl={selection.imageUrl}
                  color={selection.color}
                  className="h-10 w-10"
                />
                <span className="min-w-[120px] flex-1">
                  <span className="block text-2xl leading-tight text-arcade-text">{selection.label}</span>
                  <span className="mt-1.5 block h-2 bg-[#0b0714]">
                    <span className="block h-full transition-all" style={{ backgroundColor: selection.color, width: `${pct}%` }} />
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
                key={selection.id}
                type="button"
                aria-pressed={picked}
                onClick={() =>
                  toggle({
                    marketType: 'match',
                    marketId: match.id,
                    selectionId: selection.id,
                    marketLabel: match.title,
                    selectionLabel: selection.label,
                  })
                }
                className={`block w-full border-b border-arcade-border-strong px-4 py-4 text-left transition-colors hover:bg-[#1d1233] ${
                  picked ? 'bg-[#2a1150]' : ''
                }`}
              >
                {content}
              </button>
            ) : (
              <div key={selection.id} className="border-b border-arcade-border-strong px-4 py-4">
                {content}
              </div>
            )
          })}
          <p className="px-4 py-3.5 font-arcade text-lg text-arcade-text-muted">
            {isSelfExcluded
              ? 'Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.'
              : isOpen
                ? 'clica num resultado pra montar sua aposta · odd parimutuel, muda conforme a galera aposta'
                : 'mercado fechado — mostrando o pool final'}
          </p>
        </div>

        <div className="border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel-lg">
          <h2 className="mb-4 font-pixel text-[10px] tracking-widest text-arcade-cyan">HISTÓRICO DAS ODDS</h2>
          <OddsHistoryChart snapshots={oddsHistory} selectionLabel={selectionLabel} />
        </div>

        {match.bestOf > 1 && (
          <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel lg:col-span-2">
            <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3">
              <span className="font-pixel text-[10px] tracking-widest text-arcade-text">MELHOR DE {match.bestOf}</span>
              <span className="font-arcade text-lg text-arcade-text-muted">
                placar {match.participants.map((participant) => unitWinsOf(participant.id)).join('-')}
              </span>
            </div>
            {match.units.length === 0 ? (
              <p className="px-4 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma unidade disputada ainda.</p>
            ) : (
              match.units.map((unit) => (
                <div key={unit.unitNumber} className="flex items-center justify-between gap-3 border-b border-arcade-border-strong px-4 py-3 font-arcade text-lg">
                  <span className="text-arcade-text-muted">Unidade {unit.unitNumber}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-arcade-text">{selectionLabel(unit.winnerParticipantId ?? '')}</span>
                    {unit.proofImageUrl && (
                      <a
                        href={mediaUrl(unit.proofImageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-arcade-cyan underline"
                      >
                        ver foto
                      </a>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel lg:col-span-2">
          <h2 className="border-b-3 border-arcade-border-strong px-4 py-3 font-pixel text-[10px] tracking-widest text-arcade-amber">
            QUEM JÁ ENTROU ({book.length})
          </h2>
          {book.length === 0 ? (
            <p className="px-4 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma aposta ainda.</p>
          ) : (
            book.map((bet) => {
              const on = selectionLabel(bet.selectionId)
              return (
                <div key={bet.id} className="flex items-center gap-3 border-b border-arcade-border-strong px-4 py-3">
                  <span className="min-w-0 flex-1 font-arcade text-lg text-arcade-text-soft">
                    <span className="text-arcade-text-muted">{bet.bettorLabel}</span> em{' '}
                    <span className="text-arcade-text">{on}</span>
                  </span>
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-xl text-arcade-lime">{formatBRL(bet.stake)}</span>
                    <StatusBadge status={bet.status} />
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <CommentSection subjectType="match" subjectId={match.id} />

      {/* A sala de controle é SEMPRE a última seção da página — nada fica
          abaixo dela (decisão do dono). Os comentários vêm antes. */}
      {isAdmin && match.status !== 'settled' && match.status !== 'cancelled' && (
        <div className="space-y-4 border-3 border-arcade-amber bg-arcade-surface p-5 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-widest text-arcade-amber">SALA DE CONTROLE</h2>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            {match.status === 'open' && (
              <Button variant="warning" onClick={lock}>
                Travar apostas
              </Button>
            )}
            {match.status === 'open' && !isEditing && (
              <Button variant="secondary" onClick={startEdit}>
                Editar
              </Button>
            )}
            {match.status === 'locked' && match.bestOf > 1 && (
              <span className="w-full font-arcade text-lg text-arcade-text-muted">
                Vencedor da unidade {nextUnitNumber}:
              </span>
            )}
            {match.status === 'locked' &&
              match.participants.map((participant) => (
                <Button
                  key={participant.id}
                  variant="warning"
                  onClick={() => setPendingResult({ winnerParticipantId: participant.id, file: null })}
                >
                  {match.bestOf > 1 ? participant.displayName : `Vencedor: ${participant.displayName}`}
                </Button>
              ))}
            {match.status === 'locked' && match.allowsDraw && (
              <Button variant="secondary" onClick={() => setPendingResult({ winnerParticipantId: null, file: null })}>
                Empate
              </Button>
            )}
            <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancelar partida
            </Button>
          </div>

          {match.status === 'open' && isEditing && (
            <form onSubmit={onEditSubmit} className="space-y-3.5 border-3 border-arcade-border-strong bg-arcade-header p-4">
              <h3 className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">EDITAR PARTIDA</h3>
              <Field label="TÍTULO" required {...editForm.register('title')} />
              <div className="space-y-2">
                <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">CATEGORIA</span>
                <CategoryPicker
                  categories={categories}
                  value={editForm.watch('categoryId') || null}
                  onChange={(leafId) => editForm.setValue('categoryId', leafId ?? '')}
                />
              </div>
              <Field label="DATA E HORA" type="datetime-local" required {...editForm.register('scheduledAt')} />
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

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancelar a partida?"
        description="Todas as apostas abertas são estornadas para as carteiras. Não dá pra desfazer."
        confirmLabel="Cancelar partida"
        onConfirm={() => {
          cancel()
          setConfirmingCancel(false)
        }}
        onCancel={() => setConfirmingCancel(false)}
      />

      <ConfirmDialog
        open={pendingResult !== null}
        title="Registrar resultado"
        description="Anexe uma foto que comprove o resultado — obrigatória para registrar."
        confirmLabel={recordingUnitResult ? 'Enviando…' : 'Registrar resultado'}
        confirmDisabled={!pendingResult?.file || recordingUnitResult}
        onConfirm={() => {
          if (pendingResult?.file) recordUnitResult(pendingResult.winnerParticipantId, pendingResult.file)
          setPendingResult(null)
        }}
        onCancel={() => setPendingResult(null)}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(event) =>
            setPendingResult((current) => (current ? { ...current, file: event.target.files?.[0] ?? null } : current))
          }
          className="w-full border-2 border-arcade-border bg-[#0b0714] px-2.5 py-2 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
        />
      </ConfirmDialog>
    </div>
  )
}
