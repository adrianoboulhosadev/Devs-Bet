'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MarketOddsDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'

interface OutrightBetFields {
  selectionId: string
  amount: string // reais
}

/**
 * Outright (champion) market of a tournament: live pool/odds per participant and
 * placing a bet on who lifts the trophy. The window is enforced by the backend
 * (open only before the tournament starts); `open` here just drives the UI + poll.
 */
export function useOutright(tournamentId: string, open: boolean) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const oddsKey = ['outright-odds', tournamentId]

  const odds = useQuery({
    queryKey: oddsKey,
    queryFn: async (): Promise<MarketOddsDTO> =>
      (await api.get<MarketOddsDTO>(`/bet/tournament/${tournamentId}/odds`)).data,
    // Odds float while the market is open; poll to reflect new bets.
    refetchInterval: open ? 5000 : false,
  })

  const form = useForm<OutrightBetFields>({ defaultValues: { selectionId: '', amount: '' } })

  const place = useMutation({
    mutationFn: (fields: OutrightBetFields) =>
      api.post('/bet', {
        marketType: 'tournament_outright',
        marketId: tournamentId,
        selectionId: fields.selectionId,
        stake: toCents(fields.amount),
      }),
    onSuccess: () => {
      form.reset()
      queryClient.invalidateQueries({ queryKey: oddsKey })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['my-bets'] })
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível apostar no campeão.')),
  })

  const onSubmit = form.handleSubmit((fields) => {
    setError(null)
    place.mutate(fields)
  })

  return { odds: odds.data, form, onSubmit, placing: place.isPending, error }
}
