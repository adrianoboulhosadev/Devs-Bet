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
  // The payout receipt is mandatory proof the money actually left — uploaded
  // first (same /upload/receipts route the user's own deposit proof goes
  // through), then the returned URL rides along with the confirmation.
  const confirmWithdrawal = useMutation({
    mutationFn: async ({ id, receipt }: { id: string; receipt: File }) => {
      const upload = new FormData()
      upload.append('file', receipt)
      const { url: receiptUrl } = (await api.post<{ url: string }>('/upload/receipts', upload)).data
      await api.post(`/admin/withdrawals/${id}/confirm`, { receiptUrl })
    },
    onSuccess: () => {
      invalidate()
      notify.success('Saque marcado como pago.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível confirmar o saque.'),
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/payments/${id}/reject`, { reason: reason.trim() || undefined }),
    onSuccess: () => {
      invalidate()
      notify.success('Pagamento rejeitado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível rejeitar o pagamento.'),
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
    confirmWithdrawal: (id: string, receipt: File) => confirmWithdrawal.mutate({ id, receipt }),
    confirmingWithdrawal: confirmWithdrawal.isPending,
    reject: (id: string, reason: string) => reject.mutate({ id, reason }),
    rejecting: reject.isPending,
    users: users.data ?? [],
    usersLoading: users.isLoading,
    approveUser: (userId: string) => setApproval.mutate({ userId, approve: true }),
    rejectUser: (userId: string) => setApproval.mutate({ userId, approve: false }),
    savingApproval: setApproval.isPending,
  }
}
