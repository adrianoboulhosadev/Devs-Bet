'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { mediaUrl } from '@/lib/media'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useWallet } from './hooks/use-wallet'
import { DepositLimits } from './components/deposit-limits'
import { SelfExclusion } from './components/self-exclusion'
import { StakeLimit } from './components/stake-limit'

export default function WalletPage() {
  const {
    wallet,
    payments,
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

      {/* Sem `items-start`: os dois cards são itens da MESMA linha do grid e o
          stretch padrão iguala a altura deles (era o `items-start` que deixava o
          card de depósito mais baixo que o de saque). O extrato saiu daqui pra
          ocupar a largura inteira logo abaixo, em vez de ficar espremido numa
          coluna com um vazio do lado. */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
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
              <Field label="VALOR (R$)" money placeholder="0,00" required {...depositForm.register('amount')} />
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

        <form onSubmit={onWithdraw} className="space-y-3.5 border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel-lg">
          <h2 className="font-pixel text-xs tracking-wide text-arcade-cyan">SACAR FICHAS</h2>
          <Field label="VALOR (R$)" money placeholder="0,00" required {...withdrawForm.register('amount')} />
          <Button type="submit" variant="secondary" disabled={withdrawing} className="w-full">
            {withdrawing ? 'Solicitando…' : 'Solicitar saque'}
          </Button>
          <p className="font-arcade text-base text-arcade-text-muted">
            O valor fica reservado até o administrador efetuar o pagamento.
          </p>
        </form>
      </div>

      <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
        <h2 className="border-b-3 border-arcade-border-strong px-5 py-3 font-pixel text-[10px] tracking-widest text-arcade-text-muted">
          EXTRATO
        </h2>
        {payments.length === 0 ? (
          <p className="px-5 py-4 font-arcade text-lg text-arcade-text-muted">Nenhum pagamento ainda.</p>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="space-y-1.5 border-b border-arcade-border-strong px-5 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl text-arcade-text">{formatBRL(payment.amount)}</span>
                <StatusBadge status={payment.status} />
              </div>
              <p className="font-arcade text-lg text-arcade-text-soft">
                {payment.direction === 'deposit' ? 'Depósito Pix' : 'Saque'}{' '}
                <span className="text-arcade-text-muted">· ref {payment.referenceCode}</span>
              </p>
              {payment.receiptUrl && (
                <a
                  href={mediaUrl(payment.receiptUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-arcade text-base text-arcade-cyan underline"
                >
                  Ver comprovante
                </a>
              )}
              {payment.status === 'rejected' && payment.rejectionReason && (
                <p className="font-arcade text-base text-arcade-danger">Motivo: {payment.rejectionReason}</p>
              )}
            </div>
          ))
        )}
      </div>

      <DepositLimits />
      <StakeLimit />
      <SelfExclusion />
    </div>
  )
}
