'use client'

import { useQuery } from '@tanstack/react-query'
import type { PollDTO } from '@poll/adapters'
import { api } from '@/lib/api'

export const POLLS_KEY = ['polls']

/**
 * Every poll, shared by the lobby, the bets list and the combo builder (all of
 * which need to name a poll market and know whether it still takes bets) —
 * hence a global hook rather than one owned by a single screen.
 */
export function usePolls() {
  const query = useQuery({
    queryKey: POLLS_KEY,
    queryFn: async (): Promise<PollDTO[]> => (await api.get<PollDTO[]>('/poll')).data,
  })

  const polls = query.data ?? []

  return {
    polls,
    loading: query.isLoading,
    pollOf: (pollId: string) => polls.find((poll) => poll.id === pollId),
    optionLabelOf: (pollId: string, optionId: string) =>
      polls.find((poll) => poll.id === pollId)?.options.find((option) => option.id === optionId)
        ?.label,
  }
}
