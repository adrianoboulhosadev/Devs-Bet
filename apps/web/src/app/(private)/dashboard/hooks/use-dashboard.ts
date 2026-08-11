'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BetDTO, ComboBetDTO } from '@betting/adapters'
import type { MatchDTO, MatchStatus } from '@match/adapters'
import type { WalletDTO } from '@wallet/adapters'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

/** "Todas" plus the four match states, in the order they happen. */
export type MatchFilter = 'all' | MatchStatus

export const MATCH_FILTERS: Array<{ id: MatchFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Abertas' },
  { id: 'locked', label: 'Travadas' },
  { id: 'settled', label: 'Encerradas' },
  { id: 'cancelled', label: 'Canceladas' },
]

export function useDashboard() {
  const { user, isAdmin } = useAuth()
  const { pathOf } = useCategories()
  const [filter, setFilter] = useState<MatchFilter>('open')

  // Every key here is already used elsewhere in the app, so React Query serves
  // most of this from cache when arriving from another screen.
  const wallet = useQuery({
    queryKey: ['wallet'],
    queryFn: async (): Promise<WalletDTO> => (await api.get<WalletDTO>('/wallet/me')).data,
  })

  const bets = useQuery({
    queryKey: ['my-bets'],
    queryFn: async (): Promise<BetDTO[]> => (await api.get<BetDTO[]>('/bet/mine')).data,
  })

  const combos = useQuery({
    queryKey: ['combo-mine'],
    queryFn: async (): Promise<ComboBetDTO[]> => (await api.get<ComboBetDTO[]>('/bet/combo/mine')).data,
  })

  const matches = useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const summary = useMemo(() => {
    const allBets = bets.data ?? []
    const allCombos = combos.data ?? []

    const openCount =
      allBets.filter((bet) => bet.status === 'open').length +
      allCombos.filter((combo) => combo.status === 'open').length

    // Net result over everything already graded. A refund pays the stake back,
    // so it contributes exactly 0 — same reasoning as the leaderboard.
    const settled = [...allBets, ...allCombos].filter((entry) => entry.status !== 'open')
    const netResult = settled.reduce((total, entry) => total + entry.payout - entry.stake, 0)
    const wins = settled.filter((entry) => entry.status === 'won').length

    return {
      available: wallet.data?.available ?? 0,
      held: wallet.data?.held ?? 0,
      openCount,
      settledCount: settled.length,
      wins,
      netResult,
    }
  }, [bets.data, combos.data, wallet.data])

  const countsByStatus = useMemo(() => {
    const all = matches.data ?? []
    return MATCH_FILTERS.reduce<Record<MatchFilter, number>>(
      (counts, entry) => ({
        ...counts,
        [entry.id]: entry.id === 'all' ? all.length : all.filter((match) => match.status === entry.id).length,
      }),
      {} as Record<MatchFilter, number>,
    )
  }, [matches.data])

  const visibleMatches = useMemo(() => {
    const all = matches.data ?? []
    const filtered = filter === 'all' ? all : all.filter((match) => match.status === filter)
    // Soonest first while there is still something to bet on; most recent first
    // once they are done — in both cases the interesting end of the list.
    const ascending = filter === 'open' || filter === 'locked'
    return [...filtered].sort((first, second) => {
      const left = new Date(first.scheduledAt).getTime()
      const right = new Date(second.scheduledAt).getTime()
      return ascending ? left - right : right - left
    })
  }, [matches.data, filter])

  return {
    user,
    isAdmin,
    pathOf,
    loading: wallet.isLoading || matches.isLoading,
    summary,
    filter,
    setFilter,
    countsByStatus,
    matches: visibleMatches,
  }
}
