'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LeaderboardRow } from '../types/leaderboard-row'

export function useLeaderboard() {
  const query = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardRow[]> =>
      (await api.get<LeaderboardRow[]>('/bet/leaderboard')).data,
  })

  return { ranking: query.data ?? [], loading: query.isLoading }
}
