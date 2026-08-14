'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BetDTO, ComboBetDTO } from '@betting/adapters'
import type { MatchDTO } from '@match/adapters'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'

export function useBets() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['my-bets'],
    queryFn: async (): Promise<BetDTO[]> => (await api.get<BetDTO[]>('/bet/mine')).data,
  })

  // Same query keys the rest of the page already uses, so React Query serves
  // these from cache instead of firing extra requests.
  const matches = useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const tournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: async (): Promise<TournamentDTO[]> => (await api.get<TournamentDTO[]>('/tournament')).data,
  })

  // Same key /bet/combo/mine already uses (see use-my-combos.ts) — cache-shared,
  // no extra request, just enough to roll up simple bets + combo tickets into
  // one summary for the stat tiles.
  const combos = useQuery({
    queryKey: ['combo-mine'],
    queryFn: async (): Promise<ComboBetDTO[]> => (await api.get<ComboBetDTO[]>('/bet/combo/mine')).data,
  })

  const stats = useMemo(() => {
    const allBets = query.data ?? []
    const allCombos = combos.data ?? []
    const openCount =
      allBets.filter((bet) => bet.status === 'open').length +
      allCombos.filter((combo) => combo.status === 'open').length
    const openStaked =
      allBets.filter((bet) => bet.status === 'open').reduce((total, bet) => total + bet.stake, 0) +
      allCombos.filter((combo) => combo.status === 'open').reduce((total, combo) => total + combo.stake, 0)
    const settled = [...allBets, ...allCombos].filter((entry) => entry.status !== 'open')
    const wins = settled.filter((entry) => entry.status === 'won').length
    return {
      openCount,
      openStaked,
      settledCount: settled.length,
      winRate: settled.length === 0 ? null : Math.round((wins / settled.length) * 100),
    }
  }, [query.data, combos.data])

  /**
   * What to show on a bet's card: who is playing (or, for an outright, who was
   * picked to be champion) and the market's title — so the user can tell bets
   * apart at a glance without opening each match/tournament.
   */
  const marketInfoOf = (bet: BetDTO): { participants: string; title: string } => {
    if (bet.marketType === 'tournament_outright') {
      const tournament = tournaments.data?.find((entry) => entry.id === bet.marketId)
      const champion = tournament?.participants.find((participant) => participant.id === bet.selectionId)
      return {
        participants: champion ? `Campeão: ${champion.displayName}` : '—',
        title: tournament ? `${tournament.title} (campeão)` : '—',
      }
    }
    const match = matches.data?.find((entry) => entry.id === bet.marketId)
    return {
      participants: match ? match.participants.map((participant) => participant.displayName).join(' vs ') : '—',
      title: match?.title ?? '—',
    }
  }

  /**
   * A bet can only be pulled while its market still takes bets — the backend is
   * what enforces it (BETTING_CLOSED), but the button has to know too: an `open`
   * bet on a match that already kicked off is NOT cancellable, and offering the
   * action just to fail is worse than not offering it.
   */
  const canCancel = (bet: BetDTO): boolean => {
    if (bet.status !== 'open') return false
    if (bet.marketType === 'tournament_outright') {
      const tournament = tournaments.data?.find((entry) => entry.id === bet.marketId)
      return (
        !!tournament &&
        tournament.status === 'in_progress' &&
        new Date(tournament.scheduledAt).getTime() > Date.now()
      )
    }
    return matches.data?.find((entry) => entry.id === bet.marketId)?.status === 'open'
  }

  const cancel = useMutation({
    mutationFn: (betId: string) => api.post(`/bet/${betId}/cancel`),
    onSuccess: (_result, betId) => {
      queryClient.invalidateQueries({ queryKey: ['my-bets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      // The bet left the pool, so the market's odds moved.
      const bet = query.data?.find((entry) => entry.id === betId)
      if (bet) {
        queryClient.invalidateQueries({ queryKey: ['odds', bet.marketId] })
        queryClient.invalidateQueries({ queryKey: ['outright-odds', bet.marketId] })
        queryClient.invalidateQueries({ queryKey: ['odds-history', bet.marketId] })
        queryClient.invalidateQueries({ queryKey: ['book', bet.marketId] })
      }
      notify.success('Aposta cancelada — o valor voltou para a carteira.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar a aposta.'),
  })

  return {
    bets: query.data ?? [],
    loading: query.isLoading,
    stats,
    marketInfoOf,
    canCancel,
    cancelBet: (betId: string) => cancel.mutate(betId),
    cancelling: cancel.isPending,
  }
}
