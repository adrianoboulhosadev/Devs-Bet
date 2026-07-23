'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import type { MatchDTO, CreateMatchInput } from '@match/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'

const MATCHES_KEY = ['matches']

// The form mirrors CreateMatchInput but the userId of a participant is not set here.
interface MatchForm {
  title: string
  gameType: string
  participants: { displayName: string }[]
}

export function useMatches() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: MATCHES_KEY,
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const form = useForm<MatchForm>({
    defaultValues: { title: '', gameType: '', participants: [{ displayName: '' }, { displayName: '' }] },
  })
  const participants = useFieldArray({ control: form.control, name: 'participants' })

  const creation = useMutation({
    mutationFn: (input: CreateMatchInput) => api.post('/match', input),
    onSuccess: () => {
      form.reset({ title: '', gameType: '', participants: [{ displayName: '' }, { displayName: '' }] })
      queryClient.invalidateQueries({ queryKey: MATCHES_KEY })
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível criar a partida.')),
  })

  const onSubmit = form.handleSubmit((data) => {
    setError(null)
    creation.mutate({
      title: data.title,
      gameType: data.gameType.trim() || null,
      participants: data.participants
        .map((participant) => ({ displayName: participant.displayName.trim() }))
        .filter((participant) => participant.displayName),
    })
  })

  return {
    isAdmin,
    matches: query.data ?? [],
    loading: query.isLoading,
    form,
    participants,
    onSubmit,
    submitting: creation.isPending,
    error,
  }
}
