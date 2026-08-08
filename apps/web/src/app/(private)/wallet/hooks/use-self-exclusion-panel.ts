'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SelfExclusionPeriod } from '@wallet/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'

export const SELF_EXCLUSION_PERIODS: { period: SelfExclusionPeriod; label: string }[] = [
  { period: '24h', label: '24 horas' },
  { period: '7d', label: '7 dias' },
  { period: '30d', label: '30 dias' },
  { period: 'permanent', label: 'Permanente' },
]

export function useSelfExclusionPanel() {
  const queryClient = useQueryClient()
  const { exclusion, isSelfExcluded, loading } = useSelfExclusion()
  const [period, setPeriod] = useState<SelfExclusionPeriod>('24h')
  const [confirmed, setConfirmed] = useState(false)

  const start = useMutation({
    mutationFn: () => api.post('/wallet/self-exclusion', { period }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-exclusion'] })
      notify.success('Autoexclusão iniciada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível iniciar a autoexclusão.'),
  })

  const onSubmit = () => {
    if (!confirmed) {
      notify.error('Confirme que você entende que essa ação não pode ser desfeita.')
      return
    }
    start.mutate()
  }

  return {
    loading,
    exclusion,
    isSelfExcluded,
    period,
    setPeriod,
    confirmed,
    setConfirmed,
    onSubmit,
    starting: start.isPending,
  }
}
