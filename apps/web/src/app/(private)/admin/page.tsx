'use client'

import { useState } from 'react'
import type { PaymentDirection } from '@wallet/adapters'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
    confirmingWithdrawal,
    reject,
    rejecting,
    users,
    usersLoading,
    approveUser,
    rejectUser,
    savingApproval,
  } = useAdmin()

  // Marking a withdrawal paid requires the payout receipt; the file is picked
  // in this dialog, then uploaded + confirmed together on confirm.
  const [pendingPayout, setPendingPayout] = useState<{ id: string; file: File | null } | null>(null)
  // Rejecting requires a reason for a withdrawal (optional for a deposit).
  const [pendingReject, setPendingReject] = useState<{
    id: string
    direction: PaymentDirection
    reason: string
  } | null>(null)

  if (!isAdmin) {
    return (
      <p className="border-3 border-arcade-danger bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-danger">
        Área restrita ao administrador.
      </p>
    )
  }

  if (loading) return <Loading />

  const waiting = users.filter((entry) => entry.approvalStatus === 'pending').length

  // Same identification the CADASTROS list above already uses (nickname, else
  // e-mail) — a payment's `userId` alone is just an opaque hash to the admin.
  const labelForUser = (userId: string): string => {
    const user = users.find((entry) => entry.id === userId)
    return user?.nickname || user?.email || userId.slice(0, 8)
  }

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

                  <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                    <StatusBadge status={entry.approvalStatus} />
                    {/* Never on your own row: revoking yourself would leave nobody
                        able to release anyone (the backend refuses it too). */}
                    {!isMe && entry.approvalStatus !== 'approved' && (
                      <Button
                        variant="success"
                        className="max-sm:w-full"
                        disabled={savingApproval}
                        onClick={() => approveUser(entry.id)}
                      >
                        Aprovar
                      </Button>
                    )}
                    {!isMe && entry.approvalStatus !== 'rejected' && (
                      <Button
                        variant="danger"
                        className="max-sm:w-full"
                        disabled={savingApproval}
                        onClick={() => rejectUser(entry.id)}
                      >
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
                    ref {payment.referenceCode} · usuário {labelForUser(payment.userId)}
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
                <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                  <StatusBadge status={payment.status} />
                  {payment.direction === 'deposit' ? (
                    <Button variant="success" className="max-sm:w-full" onClick={() => confirmDeposit(payment.id)}>
                      Confirmar depósito
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      className="max-sm:w-full"
                      onClick={() => setPendingPayout({ id: payment.id, file: null })}
                    >
                      Marcar pago
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="max-sm:w-full"
                    onClick={() => setPendingReject({ id: payment.id, direction: payment.direction, reason: '' })}
                  >
                    Rejeitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingPayout !== null}
        title="Marcar saque como pago"
        description="Anexe o comprovante do pagamento realizado — obrigatório para confirmar."
        confirmLabel={confirmingWithdrawal ? 'Enviando…' : 'Confirmar pagamento'}
        confirmDisabled={!pendingPayout?.file || confirmingWithdrawal}
        onConfirm={() => {
          if (pendingPayout?.file) confirmWithdrawal(pendingPayout.id, pendingPayout.file)
          setPendingPayout(null)
        }}
        onCancel={() => setPendingPayout(null)}
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(event) =>
            setPendingPayout((current) => (current ? { ...current, file: event.target.files?.[0] ?? null } : current))
          }
          className="w-full border-2 border-arcade-border bg-[#0b0714] px-2.5 py-2 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingReject !== null}
        title="Rejeitar pagamento"
        description={
          pendingReject?.direction === 'withdrawal'
            ? 'Informe o motivo da rejeição — o apostador vai ver esse texto.'
            : 'Motivo da rejeição (opcional).'
        }
        confirmLabel={rejecting ? 'Rejeitando…' : 'Rejeitar'}
        confirmDisabled={
          (pendingReject?.direction === 'withdrawal' && !pendingReject.reason.trim()) || rejecting
        }
        onConfirm={() => {
          if (pendingReject) reject(pendingReject.id, pendingReject.reason)
          setPendingReject(null)
        }}
        onCancel={() => setPendingReject(null)}
      >
        <textarea
          autoFocus
          rows={3}
          value={pendingReject?.reason ?? ''}
          onChange={(event) =>
            setPendingReject((current) => (current ? { ...current, reason: event.target.value } : current))
          }
          placeholder="Motivo…"
          className="w-full resize-none border-2 border-arcade-border bg-[#0b0714] px-2.5 py-2 font-arcade text-lg text-arcade-text outline-none focus:border-arcade-cyan"
        />
      </ConfirmDialog>
    </div>
  )
}
