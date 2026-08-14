'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { StakeLimitDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toCents } from '@/lib/money'

const STAKE_LIMIT_KEY = ['stake-limit']

interface LimitForm {
  amount: string // reais
}

export function useStakeLimit() {
  const queryClient = useQueryClient()
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
      notify.success('Limite de aposta atualizado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar o limite.'),
  })

  const startEditing = () => {
    setEditing(true)
    form.reset({ amount: limit.data ? String(limit.data.amount / 100).replace('.', ',') : '' })
  }

  const onSubmit = form.handleSubmit((fields) => {
    const amount = toCents(fields.amount)
    if (amount <= 0) {
      notify.error('Informe um valor maior que zero.')
      return
    }
    setLimit.mutate(amount)
  })

  return {
    loading: limit.isLoading,
    limit: limit.data,
    editing,
    startEditing,
    cancelEditing: () => setEditing(false),
    form,
    onSubmit,
    saving: setLimit.isPending,
  }
}
