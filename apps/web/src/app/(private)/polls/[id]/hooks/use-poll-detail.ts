'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { PollDTO } from '@poll/adapters'
import type { MarketOddsDTO, OddsSnapshotDTO } from '@betting/adapters'
import type { BookEntry } from '../types/book-entry'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toDateTimeLocalValue } from '@/lib/date'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { POLLS_KEY } from '@/hooks/use-polls'

interface RescheduleFields {
  closesAt: string
}

export function usePollDetail(pollId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { pathOf } = useCategories()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  // Declaring the answer is irreversible, so the picked option waits here until
  // the admin confirms it in the dialog.
  const [pendingWinner, setPendingWinner] = useState<string | null>(null)

  const pollKey = ['poll', pollId]
  const oddsKey = ['poll-odds', pollId]
  const bookKey = ['book', pollId]
  const oddsHistoryKey = ['poll-odds-history', pollId]

  const poll = useQuery({
    queryKey: pollKey,
    queryFn: async (): Promise<PollDTO> => (await api.get<PollDTO>(`/poll/${pollId}`)).data,
  })

  const isOpen = poll.data?.status === 'open'

  const odds = useQuery({
    queryKey: oddsKey,
    queryFn: async (): Promise<MarketOddsDTO> =>
      (await api.get<MarketOddsDTO>(`/bet/poll/${pollId}/odds`)).data,
    // Odds float while the poll takes bets; poll to reflect new ones.
    refetchInterval: isOpen ? 5000 : false,
  })

  const book = useQuery({
    queryKey: bookKey,
    queryFn: async (): Promise<BookEntry[]> => (await api.get<BookEntry[]>(`/bet/poll/${pollId}`)).data,
  })

  const oddsHistory = useQuery({
    queryKey: oddsHistoryKey,
    queryFn: async (): Promise<OddsSnapshotDTO[]> =>
      (await api.get<OddsSnapshotDTO[]>(`/bet/poll/${pollId}/odds/history`)).data,
    refetchInterval: isOpen ? 5000 : false,
  })

  // The live-odds endpoint only sees OPEN bets, so once the market settles it
  // reports an empty pool. The closing pool is the last odds snapshot (all rows
  // share the recordedAt of the bet that produced them) — same reasoning as the
  // match page's.
  const closingOdds = ((): MarketOddsDTO | undefined => {
    const snapshots = oddsHistory.data
    if (!snapshots?.length) return undefined
    const lastRecordedAt = snapshots.reduce(
      (latest, snapshot) => Math.max(latest, new Date(snapshot.recordedAt).getTime()),
      0,
    )
    const closing = snapshots.filter(
      (snapshot) => new Date(snapshot.recordedAt).getTime() === lastRecordedAt,
    )
    return {
      marketId: pollId,
      totalPool: closing[0]?.totalPool ?? 0,
      entries: closing.map((snapshot) => ({
        selectionId: snapshot.selectionId,
        pool: snapshot.pool,
        bettors: 0,
        impliedOdd: snapshot.impliedOdd,
      })),
    }
  })()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: pollKey })
    queryClient.invalidateQueries({ queryKey: POLLS_KEY })
    queryClient.invalidateQueries({ queryKey: oddsKey })
    queryClient.invalidateQueries({ queryKey: bookKey })
    queryClient.invalidateQueries({ queryKey: oddsHistoryKey })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const close = useMutation({
    mutationFn: () => api.post(`/poll/${pollId}/close`),
    onSuccess: () => {
      invalidate()
      notify.success('Apostas fechadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível fechar as apostas.'),
  })

  const resolve = useMutation({
    mutationFn: (winningOptionId: string) => api.post(`/poll/${pollId}/resolve`, { winningOptionId }),
    onSuccess: () => {
      invalidate()
      notify.success('Resposta registrada — as apostas foram para a fila de pagamento.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível registrar a resposta.'),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/poll/${pollId}/cancel`),
    onSuccess: () => {
      invalidate()
      notify.success('Enquete cancelada — as apostas foram estornadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar a enquete.'),
  })

  // The deadline is the ONLY editable detail (the question, the criteria and the
  // options are the contract the bettors accepted — see the Poll aggregate).
  const editForm = useForm<RescheduleFields>({ defaultValues: { closesAt: '' } })

  const startEdit = () => {
    if (!poll.data) return
    editForm.reset({ closesAt: toDateTimeLocalValue(poll.data.closesAt) })
    setIsEditing(true)
  }

  const update = useMutation({
    mutationFn: (fields: RescheduleFields) =>
      api.patch(`/poll/${pollId}`, { closesAt: new Date(fields.closesAt).toISOString() }),
    onSuccess: () => {
      setIsEditing(false)
      invalidate()
      notify.success('Prazo atualizado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível mudar o prazo.'),
  })

  return {
    poll: poll.data,
    odds: isOpen ? odds.data : (closingOdds ?? odds.data),
    marketClosed: !isOpen,
    oddsHistory: oddsHistory.data ?? [],
    book: book.data ?? [],
    loading: poll.isLoading,
    isAdmin,
    isOpen,
    pathOf,
    close: () => close.mutate(),
    resolve: (winningOptionId: string) => resolve.mutate(winningOptionId),
    resolving: resolve.isPending,
    cancel: () => cancel.mutate(),
    pendingWinner,
    setPendingWinner,
    confirmingCancel,
    setConfirmingCancel,
    isEditing,
    startEdit,
    cancelEdit: () => setIsEditing(false),
    editForm,
    onEditSubmit: editForm.handleSubmit((fields) => update.mutate(fields)),
    saving: update.isPending,
  }
}
