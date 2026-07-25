'use client'

import { useQuery } from '@tanstack/react-query'
import type { ParticipantDTO } from '@participant/adapters'
import { api } from '@/lib/api'

export const PARTICIPANTS_KEY = ['participants']

/** Shared access to the participant catalog (flat list) — populates the picker
 * used when creating a match/tournament (see components/participant-picker). */
export function useParticipants() {
  const query = useQuery({
    queryKey: PARTICIPANTS_KEY,
    queryFn: async (): Promise<ParticipantDTO[]> =>
      (await api.get<ParticipantDTO[]>('/participant')).data,
  })

  return { participants: query.data ?? [], loading: query.isLoading }
}
