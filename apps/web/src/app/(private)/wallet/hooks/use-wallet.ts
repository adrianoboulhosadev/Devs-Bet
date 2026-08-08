'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import QRCode from 'qrcode'
import type { WalletDTO, PaymentDTO, DepositInstructions } from '@wallet/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toCents } from '@/lib/money'
import { buildPixPayload } from '@/lib/pix'

const WALLET_KEY = ['wallet']
const PAYMENTS_KEY = ['payments']

interface AmountFields {
  amount: string // reais, converted to cents on submit
}

interface ReceiptFields {
  receipt: FileList
}

// Deposit is a 2-step wizard: pick the amount, then pay the Pix + attach the
// mandatory proof. The Payment (the actual transaction) is only created at the
// very end, together with the receipt — see onConfirmDeposit.
type DepositStep = 'amount' | 'pay'

export function useWallet() {
  const queryClient = useQueryClient()
  const [depositStep, setDepositStep] = useState<DepositStep>('amount')
  const [depositAmountCents, setDepositAmountCents] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

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
  const receiptForm = useForm<ReceiptFields>()
  const withdrawForm = useForm<AmountFields>({ defaultValues: { amount: '' } })

  const deposit = useMutation({
    mutationFn: async (receipt: File) => {
      // Upload the proof first (multipart), then open the deposit request with
      // the returned URL — the transaction is only recorded together with it.
      const upload = new FormData()
      upload.append('file', receipt)
      const { url: receiptUrl } = (await api.post<{ url: string }>('/upload/receipts', upload)).data
      await api.post('/wallet/deposit', { amount: depositAmountCents, receiptUrl })
    },
    onSuccess: () => {
      depositForm.reset()
      receiptForm.reset()
      setDepositStep('amount')
      setDepositAmountCents(0)
      setQrDataUrl(null)
      invalidate()
      notify.success('Depósito enviado. O saldo entra após o administrador conferir o comprovante.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível concluir o depósito.'),
  })

  const withdraw = useMutation({
    mutationFn: (amount: number) => api.post('/wallet/withdraw', { amount }),
    onSuccess: () => {
      withdrawForm.reset()
      invalidate()
      notify.success('Saque solicitado. O valor fica reservado até o administrador efetuar o pagamento.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível solicitar o saque.'),
  })

  const onChooseAmount = depositForm.handleSubmit(async (data) => {
    const cents = toCents(data.amount)
    if (cents <= 0) {
      notify.error('Informe um valor maior que zero.')
      return
    }
    if (!instructions.data) {
      notify.error('Não foi possível carregar os dados do Pix. Tente de novo.')
      return
    }

    const payload = buildPixPayload({
      pixKey: instructions.data.pixKey,
      pixKeyType: instructions.data.pixKeyType,
      beneficiaryName: instructions.data.beneficiaryName,
      beneficiaryCity: instructions.data.beneficiaryCity,
      amountCents: cents,
    })

    setDepositAmountCents(cents)
    setQrDataUrl(await QRCode.toDataURL(payload))
    setDepositStep('pay')
  })

  const onBackToAmount = () => {
    setDepositStep('amount')
    setQrDataUrl(null)
  }

  const onConfirmDeposit = receiptForm.handleSubmit((data) => {
    const receipt = data.receipt?.[0]
    if (!receipt) {
      notify.error('Envie o comprovante de pagamento para concluir o depósito.')
      return
    }
    deposit.mutate(receipt)
  })

  const onWithdraw = withdrawForm.handleSubmit((data) => {
    withdraw.mutate(toCents(data.amount))
  })

  return {
    wallet: wallet.data,
    payments: payments.data ?? [],
    instructions: instructions.data,
    loading: wallet.isLoading,
    depositStep,
    depositAmountCents,
    qrDataUrl,
    depositForm,
    receiptForm,
    withdrawForm,
    onChooseAmount,
    onBackToAmount,
    onConfirmDeposit,
    onWithdraw,
    depositing: deposit.isPending,
    withdrawing: withdraw.isPending,
  }
}
