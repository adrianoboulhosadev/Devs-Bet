'use client'

import { useQuery } from '@tanstack/react-query'
import type { BetDTO } from '@betting/adapters'
import { api } from '@/lib/api'

export function useBets() {
  const query = useQuery({
    queryKey: ['my-bets'],
    queryFn: async (): Promise<BetDTO[]> => (await api.get<BetDTO[]>('/bet/mine')).data,
  })

  return { bets: query.data ?? [], loading: query.isLoading }
}
