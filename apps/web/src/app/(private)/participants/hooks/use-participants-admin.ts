'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { CreateParticipantInput, UpdateParticipantInput } from '@participant/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'
import { useParticipants, PARTICIPANTS_KEY } from '@/hooks/use-participants'

interface CreateFields {
  name: string
  nickname: string
  image?: FileList
}

const emptyForm: CreateFields = { name: '', nickname: '' }

async function uploadImage(file?: File): Promise<string | null> {
  if (!file) return null
  const upload = new FormData()
  upload.append('image', file)
  return (await api.post<{ url: string }>('/upload/participants', upload)).data.url
}

export function useParticipantsAdmin() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { participants, loading } = useParticipants()
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PARTICIPANTS_KEY })
  const fail = (failure: unknown, fallback: string) => setError(errorMessage(failure, fallback))

  const form = useForm<CreateFields>({ defaultValues: emptyForm })

  const create = useMutation({
    mutationFn: async (data: CreateFields) => {
      const imageUrl = await uploadImage(data.image?.[0])
      const input: CreateParticipantInput = {
        name: data.name.trim(),
        nickname: data.nickname.trim() || null,
        imageUrl,
      }
      await api.post('/participant', input)
    },
    onSuccess: () => {
      form.reset(emptyForm)
      invalidate()
    },
    onError: (failure) => fail(failure, 'Não foi possível criar o participante.'),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateParticipantInput }) =>
      api.patch(`/participant/${id}`, input),
    onSuccess: invalidate,
    onError: (failure) => fail(failure, 'Não foi possível editar.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/participant/${id}`),
    onSuccess: invalidate,
    onError: (failure) => fail(failure, 'Não foi possível excluir (já usado em alguma partida/torneio).'),
  })

  const onSubmit = form.handleSubmit((data) => {
    setError(null)
    create.mutate(data)
  })

  return {
    isAdmin,
    loading,
    participants,
    form,
    onSubmit,
    submitting: create.isPending,
    updateParticipant: (id: string, input: UpdateParticipantInput) => {
      setError(null)
      update.mutate({ id, input })
    },
    remove: (id: string) => {
      setError(null)
      remove.mutate(id)
    },
    error,
  }
}
