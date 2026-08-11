'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Mirrors the backend's composed cross-context shape (apps/backend/src/user/
// user.controller.ts `ProfileDTO`) — no `@ctx/adapters` package owns this DTO,
// so it is hand-copied here (see CLAUDE.md, seção "Nível/XP do apostador").
export interface ProfileStats {
  id: string
  email: string
  nickname: string | null
  avatarUrl: string | null
  createdAt: string
  wins: number
  losses: number
  xp: number
  level: number
  xpIntoLevel: number
  xpToNextLevel: number
}

export const PROFILE_STATS_KEY = ['profile']

/** Shared by the sidebar user block and the profile page — same query-key, one request. */
export function useProfileStats() {
  return useQuery({
    queryKey: PROFILE_STATS_KEY,
    queryFn: async (): Promise<ProfileStats> => (await api.get<ProfileStats>('/user/me/profile')).data,
  })
}
