'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useWallet } from '../hooks/use-wallet'

export function Wallet() {
  const {
    wallet,
    payments,
    instructions,
    loading,
    error,
    depositForm,
    withdrawForm,
    onDeposit,
    onWithdraw,
    depositing,
    withdrawing,
  } = useWallet()

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
        <form onSubmit={onDeposit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium">Depositar via Pix</h2>
          <Field
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            {...depositForm.register('amount')}
          />
          <Button type="submit" disabled={depositing} className="w-full">
            {depositing ? 'Abrindo…' : 'Gerar depósito'}
          </Button>
          {instructions && (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Pague o Pix para:</p>
              <p>
                {instructions.beneficiaryName} — {instructions.pixKeyType}: {instructions.pixKey}
              </p>
              <p className="mt-1 text-xs">
                Use o código de referência do depósito pendente abaixo. O saldo entra após o
                administrador confirmar o recebimento.
              </p>
            </div>
          )}
        </form>

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
