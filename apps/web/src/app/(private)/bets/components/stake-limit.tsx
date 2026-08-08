'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { formatDateTime } from '@/lib/date'
import { useStakeLimit } from '../hooks/use-stake-limit'

export function StakeLimit() {
  const { loading, limit, editing, startEditing, cancelEditing, form, onSubmit, saving } =
    useStakeLimit()

  if (loading) return <Loading />

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-medium">Limite de aposta diária</h2>
        <p className="text-sm text-slate-500">
          Jogo responsável: defina um teto pro quanto você pode apostar (somando apostas simples e
          bilhetes) nas últimas 24h. Diminuir vale na hora; aumentar só entra em vigor 24h depois.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="font-medium">{limit ? formatBRL(limit.amount) : 'Sem limite definido'}</p>
          {limit?.pendingAmount && limit.effectiveAt && (
            <p className="text-xs text-amber-700">
              Novo limite de {formatBRL(limit.pendingAmount)} entra em vigor em{' '}
              {formatDateTime(limit.effectiveAt)}
            </p>
          )}
        </div>
        {!editing && (
          <Button type="button" variant="secondary" onClick={startEditing}>
            {limit ? 'Alterar' : 'Definir'}
          </Button>
        )}
      </div>

      {editing && (
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
    </div>
  )
}
