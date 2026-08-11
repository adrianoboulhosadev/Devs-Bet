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
    <div className="animate-scrIn space-y-5">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        <div className="border-3 border-arcade-amber bg-gradient-to-br from-[#2a1150] to-arcade-surface p-6 shadow-pixel-lg">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">DISPONÍVEL</p>
          <p className="text-5xl leading-tight text-arcade-amber [text-shadow:0_0_20px_rgba(255,176,32,.45)]">
            {formatBRL(wallet.available)}
          </p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel-lg">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">RESERVADO</p>
          <p className="text-5xl leading-tight text-arcade-cyan">{formatBRL(wallet.held)}</p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel-lg">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">SALDO TOTAL</p>
          <p className="text-5xl leading-tight text-arcade-text">{formatBRL(wallet.balance)}</p>
        </div>
      </div>

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <div className="space-y-4 border-3 border-arcade-lime bg-arcade-surface p-6 shadow-pixel-lg">
          <div className="flex items-center gap-3.5">
            <span className="grid h-[34px] w-[34px] flex-none animate-coinSpin place-items-center bg-arcade-amber font-pixel text-sm text-arcade-bg">
              $
            </span>
            <h2 className="font-pixel text-xs tracking-wide text-arcade-lime">INSERIR FICHAS · PIX</h2>
          </div>

          {isSelfExcluded ? (
            <p className="font-arcade text-lg text-arcade-text-muted">
              Depósitos estão bloqueados enquanto sua autoexclusão estiver ativa.
            </p>
          ) : depositStep === 'amount' ? (
            <form onSubmit={onChooseAmount} className="space-y-3.5">
              <p className="font-arcade text-lg text-arcade-text-muted">Quanto você deseja adicionar à carteira?</p>
              <Field label="VALOR (R$)" type="number" step="0.01" min="0" required {...depositForm.register('amount')} />
              <Button type="submit" variant="success" className="w-full">
                Continuar para pagamento
              </Button>
            </form>
          ) : (
            <form onSubmit={onConfirmDeposit} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="font-arcade text-lg text-arcade-text-soft">Valor: {formatBRL(depositAmountCents)}</p>
                <button type="button" onClick={onBackToAmount} className="font-arcade text-lg text-arcade-text-muted underline">
                  Voltar
                </button>
              </div>

              {qrDataUrl && (
                <div className="mx-auto w-fit border-3 border-arcade-border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR Code Pix" className="h-48 w-48" />
                </div>
              )}

              {instructions && (
                <div className="border-2 border-arcade-border bg-[#0b0714] p-3 font-arcade text-lg text-arcade-text-soft">
                  <p className="text-arcade-lime">chave pix da resenha</p>
                  <p>
                    {instructions.beneficiaryName} — {instructions.pixKeyType}: {instructions.pixKey}
                  </p>
                </div>
              )}

              <Field
                label="COMPROVANTE DE PAGAMENTO (IMAGEM OU PDF)"
                type="file"
                accept="image/*,application/pdf"
                required
                {...receiptForm.register('receipt')}
              />
              <p className="font-arcade text-base text-arcade-text-muted">
                O envio do comprovante é obrigatório para concluir o depósito. O saldo entra após o
                administrador conferir o recebimento.
              </p>

              <Button type="submit" variant="success" disabled={depositing} className="w-full">
                {depositing ? 'Enviando…' : 'Confirmar e enviar comprovante'}
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <form onSubmit={onWithdraw} className="space-y-3.5 border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel-lg">
            <h2 className="font-pixel text-xs tracking-wide text-arcade-cyan">SACAR FICHAS</h2>
            <Field label="VALOR (R$)" type="number" step="0.01" min="0" required {...withdrawForm.register('amount')} />
            <Button type="submit" variant="secondary" disabled={withdrawing} className="w-full">
              {withdrawing ? 'Solicitando…' : 'Solicitar saque'}
            </Button>
            <p className="font-arcade text-base text-arcade-text-muted">
              O valor fica reservado até o administrador efetuar o pagamento.
            </p>
          </form>

          <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
            <h2 className="border-b-3 border-arcade-border-strong px-5 py-3 font-pixel text-[10px] tracking-widest text-arcade-text-muted">
              EXTRATO
            </h2>
            {payments.length === 0 ? (
              <p className="px-5 py-4 font-arcade text-lg text-arcade-text-muted">Nenhum pagamento ainda.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-arcade-border-strong px-5 py-3">
                  <span className="font-arcade text-lg text-arcade-text-soft">
                    {payment.direction === 'deposit' ? 'Depósito Pix' : 'Saque'}{' '}
                    <span className="text-arcade-text-muted">· ref {payment.referenceCode}</span>
                  </span>
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-xl text-arcade-text">{formatBRL(payment.amount)}</span>
                    <StatusBadge status={payment.status} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DepositLimits />
      <SelfExclusion />
    </div>
  )
}
