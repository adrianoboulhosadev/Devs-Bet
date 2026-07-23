'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { WalletDTO, PaymentDTO, DepositInstructions } from '@wallet/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'

const WALLET_KEY = ['wallet']
const PAYMENTS_KEY = ['payments']

interface AmountFields {
  amount: string // reais, converted to cents on submit
}

export function useWallet() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const wallet = useQuery({
    queryKey: WALLET_KEY,
    queryFn: async (): Promise<WalletDTO> => (await api.get<WalletDTO>('/wallet/me')).data,
  })

  const payments = useQuery({
    queryKey: PAYMENTS_KEY,
    queryFn: async (): Promise<PaymentDTO[]> => (await api.get<PaymentDTO[]>('/wallet/payments')).data,
    // Poll so an admin-confirmed deposit shows up as credited without a manual refresh.
    refetchInterval: (query) =>
      query.state.data?.some((payment) => payment.status === 'pending') ? 5000 : false,
  })

  const instructions = useQuery({
    queryKey: ['deposit-instructions'],
    queryFn: async (): Promise<DepositInstructions> =>
      (await api.get<DepositInstructions>('/wallet/deposit-instructions')).data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: WALLET_KEY })
    queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY })
  }

  const depositForm = useForm<AmountFields>({ defaultValues: { amount: '' } })
  const withdrawForm = useForm<AmountFields>({ defaultValues: { amount: '' } })

  const deposit = useMutation({
    mutationFn: (amount: number) => api.post('/wallet/deposit', { amount }),
    onSuccess: () => {
      depositForm.reset()
      invalidate()
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível abrir o depósito.')),
  })

  const withdraw = useMutation({
    mutationFn: (amount: number) => api.post('/wallet/withdraw', { amount }),
    onSuccess: () => {
      withdrawForm.reset()
      invalidate()
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível solicitar o saque.')),
  })

  const onDeposit = depositForm.handleSubmit((data) => {
    setError(null)
    deposit.mutate(toCents(data.amount))
  })

  const onWithdraw = withdrawForm.handleSubmit((data) => {
    setError(null)
    withdraw.mutate(toCents(data.amount))
  })

  return {
    wallet: wallet.data,
    payments: payments.data ?? [],
    instructions: instructions.data,
    loading: wallet.isLoading,
    error,
    depositForm,
    withdrawForm,
    onDeposit,
    onWithdraw,
    depositing: deposit.isPending,
    withdrawing: withdraw.isPending,
  }
}
