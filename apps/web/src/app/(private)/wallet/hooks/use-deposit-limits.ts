'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { DepositLimitDTO, DepositLimitPeriod } from '@wallet/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toCents } from '@/lib/money'

const DEPOSIT_LIMITS_KEY = ['deposit-limits']

export const DEPOSIT_LIMIT_PERIODS: { period: DepositLimitPeriod; label: string }[] = [
  { period: 'daily', label: 'Diário' },
  { period: 'weekly', label: 'Semanal' },
  { period: 'monthly', label: 'Mensal' },
]

interface LimitForm {
  amount: string // reais
}

export function useDepositLimits() {
  const queryClient = useQueryClient()
  const [editingPeriod, setEditingPeriod] = useState<DepositLimitPeriod | null>(null)

  const limits = useQuery({
    queryKey: DEPOSIT_LIMITS_KEY,
    queryFn: async (): Promise<DepositLimitDTO[]> =>
      (await api.get<DepositLimitDTO[]>('/wallet/deposit-limits')).data,
  })

  const form = useForm<LimitForm>({ defaultValues: { amount: '' } })

  const setLimit = useMutation({
    mutationFn: (input: { period: DepositLimitPeriod; amount: number }) =>
      api.post('/wallet/deposit-limits', input),
    onSuccess: () => {
      setEditingPeriod(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: DEPOSIT_LIMITS_KEY })
      notify.success('Limite de depósito atualizado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar o limite.'),
  })

  const limitFor = (period: DepositLimitPeriod) => limits.data?.find((limit) => limit.period === period) ?? null

  const startEditing = (period: DepositLimitPeriod, currentAmount: number | null) => {
    setEditingPeriod(period)
    form.reset({ amount: currentAmount ? String(currentAmount / 100).replace('.', ',') : '' })
  }

  const onSubmit = form.handleSubmit((fields) => {
    if (!editingPeriod) return
    const amount = toCents(fields.amount)
    if (amount <= 0) {
      notify.error('Informe um valor maior que zero.')
      return
    }
    setLimit.mutate({ period: editingPeriod, amount })
  })

  return {
    loading: limits.isLoading,
    limitFor,
    editingPeriod,
    startEditing,
    cancelEditing: () => setEditingPeriod(null),
    form,
    onSubmit,
    saving: setLimit.isPending,
  }
}
