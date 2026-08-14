'use client'

import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media'
import { colorForId } from '@/lib/participant-colors'
import { useAdmin } from './hooks/use-admin'

export default function AdminPage() {
  const {
    isAdmin,
    currentUserId,
    payments,
    loading,
    confirmDeposit,
    confirmWithdrawal,
    reject,
    users,
    usersLoading,
    approveUser,
    rejectUser,
    savingApproval,
  } = useAdmin()

  if (!isAdmin) {
    return (
      <p className="border-3 border-arcade-danger bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-danger">
        Área restrita ao administrador.
      </p>
    )
  }

  if (loading) return <Loading />

  const waiting = users.filter((entry) => entry.approvalStatus === 'pending').length

  return (
    <div className="animate-scrIn space-y-7">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-pixel text-xs tracking-widest text-arcade-magenta">CADASTROS</h2>
          {waiting > 0 && (
            <span className="animate-blink font-pixel text-[10px] tracking-widest text-arcade-amber">
              {waiting} AGUARDANDO
            </span>
          )}
        </div>
        <p className="font-arcade text-lg text-arcade-text-muted">
          A plataforma é fechada: quem se cadastra só entra depois que você libera. Bloquear também
          serve pra tirar o acesso de quem já está dentro — as sessões dele caem na hora.
        </p>

        {usersLoading ? (
          <Loading compact />
        ) : (
          // Capped so a long roster does not push the payments section off the
          // page. `pr-2` keeps the cards' 6px pixel shadow from being clipped by
          // the scroll container.
          <ul className="max-h-[300px] space-y-2.5 overflow-y-auto pr-2">
            {users.map((entry) => {
              const isMe = entry.id === currentUserId
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-10 w-10 flex-none place-items-center font-pixel text-[10px] text-arcade-bg"
                      style={{ backgroundColor: colorForId(entry.id) }}
                    >
                      {(entry.nickname || entry.email).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 font-arcade text-lg">
                      <p className="truncate text-xl leading-tight text-arcade-text">
                        {entry.nickname || entry.email}
                        {isMe && <span className="ml-2 text-base text-arcade-text-muted">(você)</span>}
                        {entry.role === 'admin' && (
                          <span className="ml-2 font-pixel text-[8px] text-arcade-cyan">ADMIN</span>
                        )}
                      </p>
                      <p className="truncate text-arcade-text-muted">
                        {/* The e-mail already IS the title when there is no nickname. */}
                        {entry.nickname && `${entry.email} · `}
                        cadastrou em {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={entry.approvalStatus} />
                    {/* Never on your own row: revoking yourself would leave nobody
                        able to release anyone (the backend refuses it too). */}
                    {!isMe && entry.approvalStatus !== 'approved' && (
                      <Button variant="success" disabled={savingApproval} onClick={() => approveUser(entry.id)}>
                        Aprovar
                      </Button>
                    )}
                    {!isMe && entry.approvalStatus !== 'rejected' && (
                      <Button variant="danger" disabled={savingApproval} onClick={() => rejectUser(entry.id)}>
                        {entry.approvalStatus === 'approved' ? 'Revogar' : 'Rejeitar'}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-pixel text-xs tracking-widest text-arcade-amber">PAGAMENTOS</h2>

        {payments.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nada pendente.
          </p>
        ) : (
          <ul className="max-h-[300px] space-y-2.5 overflow-y-auto pr-2">
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
    </div>
  )
}
