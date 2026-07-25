'use client'

import { useQuery } from '@tanstack/react-query'
import type { SelfExclusionDTO } from '@wallet/adapters'
import { api } from '@/lib/api'

/** Global, read-only check: is the current user self-excluded right now? Used
 * to disable deposit/bet forms across the app — the backend enforces it
 * regardless, this is just so the UI doesn't invite an action that will fail. */
export function useSelfExclusion() {
  const query = useQuery({
    queryKey: ['self-exclusion'],
    queryFn: async (): Promise<SelfExclusionDTO | null> =>
      (await api.get<SelfExclusionDTO | null>('/wallet/self-exclusion')).data,
  })

  return { exclusion: query.data ?? null, isSelfExcluded: !!query.data, loading: query.isLoading }
}
