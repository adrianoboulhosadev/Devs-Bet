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

  if (loading) return <Loading compact />

  return (
    <div className="space-y-3.5 border-3 border-arcade-border bg-arcade-surface p-5 shadow-pixel">
      <div>
        <h2 className="font-pixel text-xs tracking-wide text-arcade-text">LIMITE DE APOSTA DIÁRIA</h2>
        <p className="mt-1 font-arcade text-lg text-arcade-text-muted">
          Jogo responsável: defina um teto pro quanto você pode apostar (somando apostas simples e
          múltiplas) nas últimas 24h. Diminuir vale na hora; aumentar só entra em vigor 24h depois.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl leading-tight text-arcade-text">
            {limit ? formatBRL(limit.amount) : 'Sem limite definido'}
          </p>
          {limit?.pendingAmount && limit.effectiveAt && (
            <p className="font-arcade text-base text-arcade-amber">
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
}
