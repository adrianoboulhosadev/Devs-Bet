'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import type { TournamentDTO, CreateTournamentInput } from '@tournament/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

const TOURNAMENTS_KEY = ['tournaments']

export const TOURNAMENT_SIZES = [2, 4, 8, 16, 32]
// bestOf option for a single round. Must match Match.VALID_BEST_OF.
export const TOURNAMENT_BEST_OF_OPTIONS = [1, 3, 5] as const
// Round labels by distance to the final (mirrors use-tournament-detail's).
export const ROUND_LABELS = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '16-avos']

// Mirrors CreateTournamentInput minus the wire concerns: image is an optional
// FileList; size drives how many participant fields are shown; bestOfByRound has
// one entry per round (index 0 = fullest round, last = the final) so e.g. every
// round can be MD3 except an MD5 final; categoryId is the chosen LEAF (set by
// the CategoryPicker).
interface TournamentForm {
  title: string
  categoryId: string
  scheduledAt: string
  size: number
  bestOfByRound: number[]
  image?: FileList
  participants: { displayName: string }[]
}

const DEFAULT_SIZE = 8

const emptyForm = (): TournamentForm => ({
  title: '',
  categoryId: '',
  scheduledAt: '',
  size: DEFAULT_SIZE,
  bestOfByRound: Array(Math.log2(DEFAULT_SIZE)).fill(1),
  participants: Array.from({ length: DEFAULT_SIZE }, () => ({ displayName: '' })),
})

export function useTournaments() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: TOURNAMENTS_KEY,
    queryFn: async (): Promise<TournamentDTO[]> =>
      (await api.get<TournamentDTO[]>('/tournament')).data,
  })

  const form = useForm<TournamentForm>({ defaultValues: emptyForm() })
  const participants = useFieldArray({ control: form.control, name: 'participants' })
  const size = Number(form.watch('size'))
  const roundCount = TOURNAMENT_SIZES.includes(size) ? Math.log2(size) : 0

  // Keep exactly `size` participant fields, preserving any names already typed.
  useEffect(() => {
    if (!TOURNAMENT_SIZES.includes(size)) return
    const current = form.getValues('participants') ?? []
    if (current.length === size) return
    const next = Array.from({ length: size }, (_, index) => ({
      displayName: current[index]?.displayName ?? '',
    }))
    participants.replace(next)
  }, [size, form, participants])

  // Keep exactly `roundCount` bestOf fields, preserving any choices already made.
  useEffect(() => {
    if (!roundCount) return
    const current = form.getValues('bestOfByRound') ?? []
    if (current.length === roundCount) return
    const next = Array.from({ length: roundCount }, (_, index) => current[index] ?? 1)
    form.setValue('bestOfByRound', next)
  }, [roundCount, form])

  const roundLabel = (round: number): string =>
    ROUND_LABELS[roundCount - 1 - round] ?? `Rodada ${round + 1}`

  const creation = useMutation({
    mutationFn: async (data: TournamentForm): Promise<{ id: string }> => {
      // Optional image: upload first (multipart, reusing the matchs folder), then
      // create the tournament with the returned URL. No cloud.
      let imageUrl: string | null = null
      const file = data.image?.[0]
      if (file) {
        const upload = new FormData()
        upload.append('image', file)
        imageUrl = (await api.post<{ url: string }>('/upload/matchs', upload)).data.url
      }

      const input: CreateTournamentInput = {
        title: data.title,
        categoryId: data.categoryId,
        imageUrl,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        size: Number(data.size),
        bestOfByRound: data.bestOfByRound.map(Number),
        participants: data.participants
          .map((participant) => ({ displayName: participant.displayName.trim() }))
          .filter((participant) => participant.displayName),
      }
      return (await api.post<{ id: string }>('/tournament', input)).data
    },
    onSuccess: (created) => {
      form.reset(emptyForm())
      queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY })
      router.push(`/tournaments/${created.id}`)
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível criar o torneio.')),
  })

  const onSubmit = form.handleSubmit((data) => {
    setError(null)
    if (!data.categoryId) {
      setError('Selecione a categoria (até o nível mais específico).')
      return
    }
    creation.mutate(data)
  })

  return {
    isAdmin,
    tournaments: query.data ?? [],
    loading: query.isLoading,
    categories,
    pathOf,
    form,
    participants,
    roundCount,
    roundLabel,
    onSubmit,
    submitting: creation.isPending,
    error,
  }
}
