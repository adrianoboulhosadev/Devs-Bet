'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentDTO } from '@wallet/adapters'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

const PENDING_KEY = ['admin-payments']

export function useAdmin() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const query = useQuery({
    queryKey: PENDING_KEY,
    enabled: isAdmin,
    queryFn: async (): Promise<PaymentDTO[]> => (await api.get<PaymentDTO[]>('/admin/payments')).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PENDING_KEY })

  const confirmDeposit = useMutation({
    mutationFn: (id: string) => api.post(`/admin/deposits/${id}/confirm`),
    onSuccess: invalidate,
  })
  const confirmWithdrawal = useMutation({
    mutationFn: (id: string) => api.post(`/admin/withdrawals/${id}/confirm`),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payments/${id}/reject`),
    onSuccess: invalidate,
  })

  return {
    isAdmin,
    payments: query.data ?? [],
    loading: query.isLoading,
    confirmDeposit: (id: string) => confirmDeposit.mutate(id),
    confirmWithdrawal: (id: string) => confirmWithdrawal.mutate(id),
    reject: (id: string) => reject.mutate(id),
  }
}
