'use client'

import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useAdmin } from '../hooks/use-admin'

export function Admin() {
  const { isAdmin, payments, loading, confirmDeposit, confirmWithdrawal, reject } = useAdmin()

  if (!isAdmin) {
    return <p className="text-sm text-slate-500">Área restrita ao administrador.</p>
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin · pagamentos pendentes</h1>

      {payments.length === 0 ? (
        <p className="text-sm text-slate-500">Nada pendente. 🎉</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {payment.direction === 'deposit' ? 'Depósito' : 'Saque'} · {formatBRL(payment.amount)}
                </p>
                <p className="text-slate-500">
                  ref {payment.referenceCode} · usuário {payment.userId.slice(0, 8)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={payment.status} />
                {payment.direction === 'deposit' ? (
                  <Button onClick={() => confirmDeposit(payment.id)}>Confirmar depósito</Button>
                ) : (
                  <Button onClick={() => confirmWithdrawal(payment.id)}>Marcar pago</Button>
                )}
                <Button variant="danger" onClick={() => reject(payment.id)}>
                  Rejeitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
