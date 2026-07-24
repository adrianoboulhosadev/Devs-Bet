'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useDepositLimits, DEPOSIT_LIMIT_PERIODS } from '../hooks/use-deposit-limits'

export function DepositLimits() {
  const { loading, error, limitFor, editingPeriod, startEditing, cancelEditing, form, onSubmit, saving } =
    useDepositLimits()

  if (loading) return <Loading />

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-medium">Limites de depósito</h2>
        <p className="text-sm text-slate-500">
          Jogo responsável: defina um teto pro quanto você pode depositar. Diminuir vale na hora;
          aumentar só entra em vigor 24h depois — assim você não sobe o próprio limite por impulso.
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-slate-100">
        {DEPOSIT_LIMIT_PERIODS.map(({ period, label }) => {
          const limit = limitFor(period)
          const isEditing = editingPeriod === period

          return (
            <li key={period} className="space-y-2 py-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-slate-500">
                    {limit ? formatBRL(limit.amount) : 'Sem limite definido'}
                    {limit?.pendingAmount && limit.effectiveAt && (
                      <span className="block text-xs text-amber-700">
                        Novo limite de {formatBRL(limit.pendingAmount)} entra em vigor em{' '}
                        {formatDateTime(limit.effectiveAt)}
                      </span>
                    )}
                  </p>
                </div>
                {!isEditing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => startEditing(period, limit?.amount ?? null)}
                  >
                    {limit ? 'Alterar' : 'Definir'}
                  </Button>
                )}
              </div>

              {isEditing && (
                <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
                  <div className="w-40">
                    <Field label="Valor (R$)" type="number" step="0.01" min="0" required {...form.register('amount')} />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEditing}>
                    Cancelar
                  </Button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
