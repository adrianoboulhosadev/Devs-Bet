'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { CreateParticipantInput, UpdateParticipantInput } from '@participant/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useParticipants, PARTICIPANTS_KEY } from '@/hooks/use-participants'

interface CreateFields {
  name: string
  nickname: string
  // Already CROPPED by the ImagePicker — what the admin framed is what uploads.
  image: File | null
}

const emptyForm: CreateFields = { name: '', nickname: '', image: null }

async function uploadImage(file?: File | null): Promise<string | null> {
  if (!file) return null
  const upload = new FormData()
  upload.append('image', file)
  return (await api.post<{ url: string }>('/upload/participants', upload)).data.url
}

export function useParticipantsAdmin() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { participants, loading } = useParticipants()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PARTICIPANTS_KEY })

  const form = useForm<CreateFields>({ defaultValues: emptyForm })

  const create = useMutation({
    mutationFn: async (data: CreateFields) => {
      const imageUrl = await uploadImage(data.image)
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
      notify.success('Participante criado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível criar o participante.'),
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateParticipantInput }) =>
      api.patch(`/participant/${id}`, input),
    onSuccess: () => {
      invalidate()
      notify.success('Participante atualizado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível editar o participante.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/participant/${id}`),
    onSuccess: () => {
      invalidate()
      notify.success('Participante excluído.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível excluir o participante.'),
  })

  const onSubmit = form.handleSubmit((data) => create.mutate(data))

  return {
    isAdmin,
    loading,
    participants,
    form,
    onSubmit,
    submitting: create.isPending,
    updateParticipant: (id: string, input: UpdateParticipantInput) => update.mutate({ id, input }),
    remove: (id: string) => remove.mutate(id),
  }
}
