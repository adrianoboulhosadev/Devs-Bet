'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentDTO } from '@wallet/adapters'
import type { UserDTO } from '@auth/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'

const PENDING_KEY = ['admin-payments']
const USERS_KEY = ['admin-users']

export function useAdmin() {
  const queryClient = useQueryClient()
  const { isAdmin, user } = useAuth()

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

  // The platform's front door: every account, so a sign-up can be released and
  // an existing member can have their access revoked (see SetUserApproval).
  const users = useQuery({
    queryKey: USERS_KEY,
    enabled: isAdmin,
    queryFn: async (): Promise<UserDTO[]> => (await api.get<UserDTO[]>('/admin/users')).data,
  })

  const setApproval = useMutation({
    mutationFn: ({ userId, approve }: { userId: string; approve: boolean }) =>
      api.post(`/admin/users/${userId}/${approve ? 'approve' : 'reject'}`),
    onSuccess: (_result, { approve }) => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      notify.success(approve ? 'Acesso liberado.' : 'Acesso bloqueado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível alterar o acesso.'),
  })

  return {
    isAdmin,
    currentUserId: user?.id ?? null,
    payments: query.data ?? [],
    loading: query.isLoading,
    confirmDeposit: (id: string) => confirmDeposit.mutate(id),
    confirmWithdrawal: (id: string) => confirmWithdrawal.mutate(id),
    reject: (id: string) => reject.mutate(id),
    users: users.data ?? [],
    usersLoading: users.isLoading,
    approveUser: (userId: string) => setApproval.mutate({ userId, approve: true }),
    rejectUser: (userId: string) => setApproval.mutate({ userId, approve: false }),
    savingApproval: setApproval.isPending,
  }
}
