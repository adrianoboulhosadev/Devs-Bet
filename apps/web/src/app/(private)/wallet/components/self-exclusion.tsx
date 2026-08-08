'use client'

import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatDateTime } from '@/lib/date'
import { useSelfExclusionPanel, SELF_EXCLUSION_PERIODS } from '../hooks/use-self-exclusion-panel'

export function SelfExclusion() {
  const {
    loading,
    exclusion,
    isSelfExcluded,
    period,
    setPeriod,
    confirmed,
    setConfirmed,
    onSubmit,
    starting,
  } = useSelfExclusionPanel()

  if (loading) return <Loading />

  if (isSelfExcluded && exclusion) {
    return (
      <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="font-medium text-red-900">Autoexclusão ativa</h2>
        <p className="text-sm text-red-800">
          Depósitos e apostas estão bloqueados
          {exclusion.until ? (
            <>
              {' '}
              até <span className="font-medium">{formatDateTime(exclusion.until)}</span>.
            </>
          ) : (
            <span className="font-medium"> permanentemente.</span>
          )}{' '}
          Essa proteção não pode ser cancelada antes do prazo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-medium">Autoexclusão</h2>
        <p className="text-sm text-slate-500">
          Jogo responsável: bloqueie a si mesmo de depositar e apostar por um período. Uma vez
          iniciada, <span className="font-medium">não pode ser cancelada</span> antes do prazo —
          nem permanente pode ser desfeita.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SELF_EXCLUSION_PERIODS.map((option) => (
          <label
            key={option.period}
            className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
              period === option.period ? 'border-slate-900 bg-slate-100' : 'border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="self-exclusion-period"
              value={option.period}
              checked={period === option.period}
              onChange={() => setPeriod(option.period)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5"
        />
        Eu entendo que essa ação não pode ser desfeita antes do prazo escolhido.
      </label>

      <Button type="button" variant="danger" onClick={onSubmit} disabled={starting}>
        {starting ? 'Iniciando…' : 'Iniciar autoexclusão'}
      </Button>
    </div>
  )
}
