'use client'

import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { mediaUrl } from '@/lib/media'
import { useAdmin } from '../hooks/use-admin'

export function Admin() {
  const { isAdmin, payments, loading, confirmDeposit, confirmWithdrawal, reject } = useAdmin()

  if (!isAdmin) {
    return (
      <p className="border-3 border-arcade-danger bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-danger">
        Área restrita ao administrador.
      </p>
    )
  }

  if (loading) return <Loading />

  return (
    <div className="animate-scrIn space-y-4">
      <h2 className="font-pixel text-xs tracking-widest text-arcade-amber">FILA DE APROVAÇÃO</h2>

      {payments.length === 0 ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
          Nada pendente.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel"
            >
              <div className="font-arcade text-lg">
                <p className="text-2xl leading-tight text-arcade-text">
                  {payment.direction === 'deposit' ? 'Depósito' : 'Saque'} · {formatBRL(payment.amount)}
                </p>
                <p className="text-arcade-text-muted">
                  ref {payment.referenceCode} · usuário {payment.userId.slice(0, 8)}
                </p>
                {payment.receiptUrl && (
                  <a
                    href={mediaUrl(payment.receiptUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-arcade-cyan underline"
                  >
                    Ver comprovante
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <StatusBadge status={payment.status} />
                {payment.direction === 'deposit' ? (
                  <Button variant="success" onClick={() => confirmDeposit(payment.id)}>
                    Confirmar depósito
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => confirmWithdrawal(payment.id)}>
                    Marcar pago
                  </Button>
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
