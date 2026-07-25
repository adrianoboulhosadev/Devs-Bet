'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { StakeLimitDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'

const STAKE_LIMIT_KEY = ['stake-limit']

interface LimitForm {
  amount: string // reais
}

export function useStakeLimit() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const limit = useQuery({
    queryKey: STAKE_LIMIT_KEY,
    queryFn: async (): Promise<StakeLimitDTO | null> =>
      (await api.get<StakeLimitDTO | null>('/bet/stake-limit')).data,
  })

  const form = useForm<LimitForm>({ defaultValues: { amount: '' } })

  const setLimit = useMutation({
    mutationFn: (amount: number) => api.post('/bet/stake-limit', { amount }),
    onSuccess: () => {
      setEditing(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: STAKE_LIMIT_KEY })
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível salvar o limite.')),
  })

  const startEditing = () => {
    setError(null)
    setEditing(true)
    form.reset({ amount: limit.data ? String(limit.data.amount / 100).replace('.', ',') : '' })
  }

  const onSubmit = form.handleSubmit((fields) => {
    setError(null)
    const amount = toCents(fields.amount)
    if (amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setLimit.mutate(amount)
  })

  return {
    loading: limit.isLoading,
    limit: limit.data,
    error,
    editing,
    startEditing,
    cancelEditing: () => setEditing(false),
    form,
    onSubmit,
    saving: setLimit.isPending,
  }
}
