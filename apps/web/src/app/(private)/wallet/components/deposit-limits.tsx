'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useDepositLimits, DEPOSIT_LIMIT_PERIODS } from '../hooks/use-deposit-limits'

export function DepositLimits() {
  const { loading, limitFor, editingPeriod, startEditing, cancelEditing, form, onSubmit, saving } =
    useDepositLimits()

  if (loading) return <Loading />

  return (
    <div className="space-y-3.5 border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel">
      <div>
        <h2 className="font-pixel text-xs tracking-wide text-arcade-text">LIMITES DE DEPÓSITO</h2>
        <p className="mt-1 font-arcade text-lg text-arcade-text-muted">
          Jogo responsável: defina um teto pro quanto você pode depositar. Diminuir vale na hora;
          aumentar só entra em vigor 24h depois — assim você não sobe o próprio limite por impulso.
        </p>
      </div>

      <div>
        {DEPOSIT_LIMIT_PERIODS.map(({ period, label }) => {
          const limit = limitFor(period)
          const isEditing = editingPeriod === period

          return (
            <div key={period} className="space-y-2.5 border-b border-arcade-border-strong py-3.5 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-pixel text-[10px] tracking-widest text-arcade-text-muted">{label.toUpperCase()}</p>
                  <p className="text-xl text-arcade-text">
                    {limit ? formatBRL(limit.amount) : 'Sem limite definido'}
                  </p>
                  {limit?.pendingAmount && limit.effectiveAt && (
                    <p className="font-arcade text-base text-arcade-amber">
                      Novo limite de {formatBRL(limit.pendingAmount)} entra em vigor em{' '}
                      {formatDateTime(limit.effectiveAt)}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <Button type="button" variant="secondary" onClick={() => startEditing(period, limit?.amount ?? null)}>
                    {limit ? 'Alterar' : 'Definir'}
                  </Button>
                )}
              </div>

              {isEditing && (
                <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2.5">
                  <div className="w-40">
                    <Field label="VALOR (R$)" type="number" step="0.01" min="0" required {...form.register('amount')} />
                  </div>
                  <Button type="submit" variant="warning" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
