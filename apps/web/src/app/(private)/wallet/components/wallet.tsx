'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useWallet } from '../hooks/use-wallet'
import { DepositLimits } from './deposit-limits'
import { SelfExclusion } from './self-exclusion'

export function Wallet() {
  const {
    wallet,
    payments,
    instructions,
    loading,
    error,
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
    depositing,
    withdrawing,
  } = useWallet()
  const { isSelfExcluded } = useSelfExclusion()

  if (loading || !wallet) return <Loading />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Carteira</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Disponível</p>
          <p className="text-2xl font-semibold">{formatBRL(wallet.available)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Saldo total</p>
          <p className="text-2xl font-semibold">{formatBRL(wallet.balance)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Reservado (apostas/saques)</p>
          <p className="text-2xl font-semibold">{formatBRL(wallet.held)}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Depositar via Pix</h2>

          {isSelfExcluded ? (
            <p className="text-sm text-slate-500">
              Depósitos estão bloqueados enquanto sua autoexclusão estiver ativa.
            </p>
          ) : depositStep === 'amount' ? (
            <form onSubmit={onChooseAmount} className="space-y-3">
              <p className="text-sm text-slate-500">Quanto você deseja adicionar à carteira?</p>
              <Field
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                required
                {...depositForm.register('amount')}
              />
              <Button type="submit" className="w-full">
                Continuar para pagamento
              </Button>
            </form>
          ) : (
            <form onSubmit={onConfirmDeposit} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Valor: {formatBRL(depositAmountCents)}</p>
                <button
                  type="button"
                  onClick={onBackToAmount}
                  className="text-sm text-slate-500 underline"
                >
                  Voltar
                </button>
              </div>

              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code Pix" className="mx-auto h-48 w-48" />
              )}

              {instructions && (
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Ou copie a chave:</p>
                  <p>
                    {instructions.beneficiaryName} — {instructions.pixKeyType}: {instructions.pixKey}
                  </p>
                </div>
              )}

              <Field
                label="Comprovante de pagamento (imagem ou PDF)"
                type="file"
                accept="image/*,application/pdf"
                required
                {...receiptForm.register('receipt')}
              />
              <p className="text-xs text-slate-500">
                O envio do comprovante é obrigatório para concluir o depósito. O saldo entra após o
                administrador conferir o recebimento.
              </p>

              <Button type="submit" disabled={depositing} className="w-full">
                {depositing ? 'Enviando…' : 'Confirmar e enviar comprovante'}
              </Button>
            </form>
          )}
        </div>

        <form onSubmit={onWithdraw} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Solicitar saque</h2>
          <Field
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            {...withdrawForm.register('amount')}
          />
          <Button type="submit" variant="secondary" disabled={withdrawing} className="w-full">
            {withdrawing ? 'Solicitando…' : 'Solicitar saque'}
          </Button>
          <p className="text-xs text-slate-500">
            O valor fica reservado até o administrador efetuar o pagamento.
          </p>
        </form>
      </div>

      <DepositLimits />
      <SelfExclusion />

      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 font-medium">Histórico</h2>
        {payments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhum pagamento ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <span className="font-medium">
                    {payment.direction === 'deposit' ? 'Depósito' : 'Saque'}
                  </span>{' '}
                  <span className="text-slate-500">· ref {payment.referenceCode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatBRL(payment.amount)}</span>
                  <StatusBadge status={payment.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
