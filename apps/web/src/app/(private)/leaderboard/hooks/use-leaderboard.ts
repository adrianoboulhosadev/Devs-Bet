'use client'

import { useQuery } from '@tanstack/react-query'
import type { LeaderboardEntryDTO } from '@betting/adapters'
import { api } from '@/lib/api'

export function useLeaderboard() {
  const query = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntryDTO[]> =>
      (await api.get<LeaderboardEntryDTO[]>('/bet/leaderboard')).data,
  })

  return { ranking: query.data ?? [], loading: query.isLoading }
}
