'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO } from '@match/adapters'
import type { MarketOddsDTO, OddsSnapshotDTO } from '@betting/adapters'
import type { BookEntry } from '../types/book-entry'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toDateTimeLocalValue } from '@/lib/date'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { MATCH_DRAW_SELECTION_ID } from '@/data/match-selections'

interface EditFields {
  title: string
  categoryId: string
  scheduledAt: string
}

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const [isEditing, setIsEditing] = useState(false)

  const matchKey = ['match', matchId]
  const oddsKey = ['odds', matchId]
  const bookKey = ['book', matchId]

  const match = useQuery({
    queryKey: matchKey,
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${matchId}`)).data,
  })

  const isOpen = match.data?.status === 'open'

  const odds = useQuery({
    queryKey: oddsKey,
    queryFn: async (): Promise<MarketOddsDTO> =>
      (await api.get<MarketOddsDTO>(`/bet/match/${matchId}/odds`)).data,
    // Odds float while the match is open; poll to reflect new bets.
    refetchInterval: isOpen ? 5000 : false,
  })

  const book = useQuery({
    queryKey: bookKey,
    queryFn: async (): Promise<BookEntry[]> => (await api.get<BookEntry[]>(`/bet/match/${matchId}`)).data,
  })

  const oddsHistoryKey = ['odds-history', matchId]
  const oddsHistory = useQuery({
    queryKey: oddsHistoryKey,
    queryFn: async (): Promise<OddsSnapshotDTO[]> =>
      (await api.get<OddsSnapshotDTO[]>(`/bet/match/${matchId}/odds/history`)).data,
    refetchInterval: isOpen ? 5000 : false,
  })

  // The live-odds endpoint only sees OPEN bets, so once the market settles it
  // reports an empty pool. The closing pool is the last odds snapshot (all rows
  // share the recordedAt of the bet that produced them) — see OddsSnapshotDTO.
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
      marketId: matchId,
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
    queryClient.invalidateQueries({ queryKey: matchKey })
    queryClient.invalidateQueries({ queryKey: oddsKey })
    queryClient.invalidateQueries({ queryKey: bookKey })
    queryClient.invalidateQueries({ queryKey: oddsHistoryKey })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const lock = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/lock`),
    onSuccess: () => {
      invalidate()
      notify.success('Apostas travadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível travar as apostas.'),
  })

  // Whether this match is a tournament confrontation (bracket or group-stage)
  // — if it is, the result has to go through the tournament's own route (it
  // advances the bracket/group); a standalone match posts to its own route.
  // This is the ONLY place a result can be declared any more — the tournament
  // page's bracket/group cards no longer offer it (see BracketSlotCard).
  const tournamentLink = useQuery({
    queryKey: ['tournament-by-match', matchId],
    queryFn: async (): Promise<{ tournamentId: string | null }> =>
      (await api.get<{ tournamentId: string | null }>(`/tournament/by-match/${matchId}`)).data,
  })

  // Records the winner of the match's next unit (map/leg/round/fight). A bestOf-1
  // match settles right away; a bestOf-3/5 one may need this called again. The
  // proof photo is uploaded first — recording a result without one is rejected
  // by the domain (MatchUnit.proofImageUrl).
  const recordUnitResult = useMutation({
    mutationFn: async ({
      winnerParticipantId,
      proof,
    }: {
      winnerParticipantId: string | null
      proof: File
    }) => {
      const upload = new FormData()
      upload.append('image', proof)
      const { url: proofImageUrl } = (await api.post<{ url: string }>('/upload/results', upload)).data

      const tournamentId = tournamentLink.data?.tournamentId
      if (tournamentId) {
        await api.post(`/tournament/${tournamentId}/matches/${matchId}/result`, {
          winnerParticipantId,
          proofImageUrl,
        })
      } else {
        await api.post(`/match/${matchId}/units`, { winnerParticipantId, proofImageUrl })
      }
    },
    onSuccess: () => {
      invalidate()
      notify.success('Resultado registrado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível registrar o resultado.'),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/cancel`),
    onSuccess: () => {
      invalidate()
      notify.success('Partida cancelada — as apostas foram estornadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar a partida.'),
  })

  // Edit (admin, only while open): title / gameType / scheduledAt.
  const editForm = useForm<EditFields>({ defaultValues: { title: '', categoryId: '', scheduledAt: '' } })

  const startEdit = () => {
    if (!match.data) return
    editForm.reset({
      title: match.data.title,
      categoryId: match.data.categoryId,
      scheduledAt: toDateTimeLocalValue(match.data.scheduledAt),
    })
    setIsEditing(true)
  }

  const update = useMutation({
    mutationFn: (fields: EditFields) =>
      api.patch(`/match/${matchId}`, {
        title: fields.title,
        categoryId: fields.categoryId,
        scheduledAt: new Date(fields.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      setIsEditing(false)
      invalidate()
      notify.success('Partida atualizada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar a partida.'),
  })

  const onEditSubmit = editForm.handleSubmit((fields) => update.mutate(fields))

  // Destructive action guard for the cancel button.
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  return {
    confirmingCancel,
    setConfirmingCancel,
    match: match.data,
    odds: isOpen ? odds.data : (closingOdds ?? odds.data),
    marketClosed: !isOpen,
    oddsHistory: oddsHistory.data ?? [],
    book: book.data ?? [],
    loading: match.isLoading,
    isAdmin,
    isOpen,
    lock: () => lock.mutate(),
    recordUnitResult: (winnerParticipantId: string | null, proof: File) =>
      recordUnitResult.mutate({ winnerParticipantId, proof }),
    recordingUnitResult: recordUnitResult.isPending,
    cancel: () => cancel.mutate(),
    isEditing,
    startEdit,
    cancelEdit: () => setIsEditing(false),
    editForm,
    onEditSubmit,
    saving: update.isPending,
    categories,
    pathOf,
  }
}
