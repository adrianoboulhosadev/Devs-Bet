'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO, CreateMatchInput } from '@match/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { useParticipants } from '@/hooks/use-participants'

const MATCHES_KEY = ['matches']

// bestOf a match can be played over — first to the majority wins (odd, so it's
// always decisive). Must match Match.VALID_BEST_OF in packages/match/core.
export const MATCH_BEST_OF_OPTIONS = [1, 3, 5] as const

// The form mirrors CreateMatchInput but participants are picked from the
// catalog (see ParticipantPicker), not typed. scheduledAt comes from
// <input type="datetime-local">; categoryId is the chosen LEAF (set by the
// CategoryPicker); image is an optional FileList.
interface MatchForm {
  title: string
  categoryId: string
  scheduledAt: string
  image?: FileList
  bestOf: number
  allowsDraw: boolean
  participantIds: string[]
}

const emptyForm: MatchForm = {
  title: '',
  categoryId: '',
  scheduledAt: '',
  bestOf: 1,
  allowsDraw: true,
  participantIds: [],
}

export function useMatches() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const { participants } = useParticipants()

  const query = useQuery({
    queryKey: MATCHES_KEY,
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const form = useForm<MatchForm>({ defaultValues: emptyForm })

  const creation = useMutation({
    mutationFn: async (data: MatchForm) => {
      // Optional image: upload the file first (multipart), then create the match
      // with the returned URL. No cloud — the backend stores it under uploads/matchs.
      let imageUrl: string | null = null
      const file = data.image?.[0]
      if (file) {
        const upload = new FormData()
        upload.append('image', file)
        imageUrl = (await api.post<{ url: string }>('/upload/matchs', upload)).data.url
      }

      const input: CreateMatchInput = {
        title: data.title,
        categoryId: data.categoryId,
        imageUrl,
        // datetime-local is local time; toISOString normalizes to UTC for the API.
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        bestOf: data.bestOf,
        // A draw is only possible in a single-unit match (an odd bestOf > 1
        // always has a majority winner).
        allowsDraw: data.bestOf === 1 && data.allowsDraw,
        participantIds: data.participantIds,
      }
      await api.post('/match', input)
    },
    onSuccess: () => {
      form.reset(emptyForm)
      queryClient.invalidateQueries({ queryKey: MATCHES_KEY })
      notify.success('Partida criada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível criar a partida.'),
  })

  const onSubmit = form.handleSubmit((data) => {
    if (!data.categoryId) {
      notify.error('Selecione a categoria (até o nível mais específico).')
      return
    }
    if (data.participantIds.length < 2) {
      notify.error('Escolha pelo menos dois participantes.')
      return
    }
    creation.mutate(data)
  })

  return {
    isAdmin,
    matches: query.data ?? [],
    loading: query.isLoading,
    categories,
    pathOf,
    participants,
    form,
    onSubmit,
    submitting: creation.isPending,
  }
}
