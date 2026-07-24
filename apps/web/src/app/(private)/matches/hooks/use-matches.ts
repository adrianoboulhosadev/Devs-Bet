'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import type { MatchDTO, CreateMatchInput } from '@match/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

const MATCHES_KEY = ['matches']

// The form mirrors CreateMatchInput but the userId of a participant is not set
// here. scheduledAt comes from <input type="datetime-local">; categoryId is the
// chosen LEAF (set by the CategoryPicker); image is an optional FileList.
interface MatchForm {
  title: string
  categoryId: string
  scheduledAt: string
  image?: FileList
  participants: { displayName: string }[]
}

const emptyForm: MatchForm = {
  title: '',
  categoryId: '',
  scheduledAt: '',
  participants: [{ displayName: '' }, { displayName: '' }],
}

export function useMatches() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: MATCHES_KEY,
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const form = useForm<MatchForm>({ defaultValues: emptyForm })
  const participants = useFieldArray({ control: form.control, name: 'participants' })

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
        participants: data.participants
          .map((participant) => ({ displayName: participant.displayName.trim() }))
          .filter((participant) => participant.displayName),
      }
      await api.post('/match', input)
    },
    onSuccess: () => {
      form.reset(emptyForm)
      queryClient.invalidateQueries({ queryKey: MATCHES_KEY })
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível criar a partida.')),
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
    matches: query.data ?? [],
    loading: query.isLoading,
    categories,
    pathOf,
    form,
    participants,
    onSubmit,
    submitting: creation.isPending,
    error,
  }
}
