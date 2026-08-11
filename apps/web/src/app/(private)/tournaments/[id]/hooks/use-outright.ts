'use client'

import { useQuery } from '@tanstack/react-query'
import type { MarketOddsDTO, OddsSnapshotDTO } from '@betting/adapters'
import { api } from '@/lib/api'

/**
 * Outright (champion) market of a tournament: live pool/odds per participant.
 * Placing the bet is the bet slip's job. The window is enforced by the backend
 * (open only before the tournament starts); `open` here just drives the UI + poll.
 */
export function useOutright(tournamentId: string, open: boolean) {
  const oddsKey = ['outright-odds', tournamentId]

  const odds = useQuery({
    queryKey: oddsKey,
    queryFn: async (): Promise<MarketOddsDTO> =>
      (await api.get<MarketOddsDTO>(`/bet/tournament/${tournamentId}/odds`)).data,
    // Odds float while the market is open; poll to reflect new bets.
    refetchInterval: open ? 5000 : false,
  })

  const oddsHistoryKey = ['outright-odds-history', tournamentId]
  const oddsHistory = useQuery({
    queryKey: oddsHistoryKey,
    queryFn: async (): Promise<OddsSnapshotDTO[]> =>
      (await api.get<OddsSnapshotDTO[]>(`/bet/tournament/${tournamentId}/odds/history`)).data,
    refetchInterval: open ? 5000 : false,
  })

  return {
    odds: odds.data,
    oddsHistory: oddsHistory.data ?? [],
  }
}
