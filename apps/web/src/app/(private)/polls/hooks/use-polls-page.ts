'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { CreatePollInput } from '@poll/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { usePolls, POLLS_KEY } from '@/hooks/use-polls'
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from '../data/option-presets'

// The form mirrors CreatePollInput, except the options are edited as plain
// strings (the API wants { label }) and closesAt comes from
// <input type="datetime-local">.
interface PollForm {
  question: string
  resolutionCriteria: string
  categoryId: string
  closesAt: string
  // Already CROPPED by the ImagePicker — what the admin framed is what uploads.
  image: File | null
  options: string[]
}

const emptyForm: PollForm = {
  question: '',
  resolutionCriteria: '',
  categoryId: '',
  closesAt: '',
  image: null,
  options: ['Sim', 'Não'],
}

export function usePollsPage() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
  const { polls, loading } = usePolls()

  const form = useForm<PollForm>({ defaultValues: emptyForm })
  const options = form.watch('options')

  const setOptions = (next: string[]) => form.setValue('options', next)

  const creation = useMutation({
    mutationFn: async (data: PollForm) => {
      // Optional image: upload the file first (multipart), then open the poll
      // with the returned URL. No cloud — the backend stores it under uploads/polls.
      let imageUrl: string | null = null
      if (data.image) {
        const upload = new FormData()
        upload.append('image', data.image)
        imageUrl = (await api.post<{ url: string }>('/upload/polls', upload)).data.url
      }

      const input: CreatePollInput = {
        question: data.question,
        resolutionCriteria: data.resolutionCriteria,
        categoryId: data.categoryId,
        imageUrl,
        // datetime-local is local time; toISOString normalizes to UTC for the API.
        closesAt: new Date(data.closesAt).toISOString(),
        options: data.options.map((label) => ({ label: label.trim() })),
      }
      await api.post('/poll', input)
    },
    onSuccess: () => {
      form.reset(emptyForm)
      queryClient.invalidateQueries({ queryKey: POLLS_KEY })
      notify.success('Enquete aberta.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível abrir a enquete.'),
  })

  const onSubmit = form.handleSubmit((data) => {
    if (!data.categoryId) {
      notify.error('Selecione a categoria (até o nível mais específico).')
      return
    }
    const filled = data.options.map((label) => label.trim()).filter(Boolean)
    if (filled.length < MIN_POLL_OPTIONS) {
      notify.error('Escreva pelo menos duas opções.')
      return
    }
    if (new Set(filled.map((label) => label.toLowerCase())).size !== filled.length) {
      notify.error('Duas opções não podem ter o mesmo texto.')
      return
    }
    creation.mutate({ ...data, options: filled })
  })

  return {
    isAdmin,
    polls,
    loading,
    categories,
    pathOf,
    form,
    options,
    addOption: () => {
      if (options.length >= MAX_POLL_OPTIONS) return
      setOptions([...options, ''])
    },
    removeOption: (index: number) => {
      if (options.length <= MIN_POLL_OPTIONS) return
      setOptions(options.filter((_option, current) => current !== index))
    },
    applyPreset: (preset: string[]) => setOptions([...preset]),
    onSubmit,
    submitting: creation.isPending,
  }
}
