'use client'

import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatDateTime } from '@/lib/date'
import { useSelfExclusionPanel } from './hooks/use-self-exclusion-panel'
import { SELF_EXCLUSION_PERIODS } from './data/periods'

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

  if (loading) return <Loading compact />

  if (isSelfExcluded && exclusion) {
    return (
      <div className="space-y-2.5 border-3 border-arcade-danger bg-arcade-surface p-6 shadow-pixel">
        <h2 className="font-pixel text-xs tracking-wide text-arcade-danger">AUTOEXCLUSÃO ATIVA</h2>
        <p className="font-arcade text-lg text-arcade-text-soft">
          Depósitos e apostas estão bloqueados
          {exclusion.until ? (
            <>
              {' '}
              até <span className="text-arcade-text">{formatDateTime(exclusion.until)}</span>.
            </>
          ) : (
            <span className="text-arcade-text"> permanentemente.</span>
          )}{' '}
          Essa proteção não pode ser cancelada antes do prazo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 border-3 border-arcade-border bg-arcade-surface p-6 shadow-pixel">
      <div>
        <h2 className="font-pixel text-xs tracking-wide text-arcade-text">AUTOEXCLUSÃO</h2>
        <p className="mt-1 font-arcade text-lg text-arcade-text-muted">
          Jogo responsável: bloqueie a si mesmo de depositar e apostar por um período. Uma vez
          iniciada, <span className="text-arcade-text">não pode ser cancelada</span> antes do prazo —
          nem permanente pode ser desfeita.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SELF_EXCLUSION_PERIODS.map((option) => (
          // `relative` is load-bearing, not cosmetic: the radio inside is
          // `sr-only` (position:absolute), so without a positioned ancestor it
          // anchors to the INITIAL containing block — i.e. the document — and
          // sits at its static offset from the top of the page. On a tall
          // screen like this one that pushed <html> past the viewport and gave
          // the app a SECOND scrollbar next to the layout's own scroll
          // container. Anchoring it to the label keeps it inside the chip.
          <label
            key={option.period}
            className={`relative cursor-pointer border-3 px-3.5 py-2 font-pixel text-[10px] tracking-wide ${
              period === option.period
                ? 'border-arcade-danger bg-arcade-danger text-arcade-bg'
                : 'border-arcade-border text-arcade-text-soft'
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

      <label className="flex items-start gap-2.5 font-arcade text-lg text-arcade-text-soft">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5 flex-none accent-arcade-danger"
        />
        Eu entendo que essa ação não pode ser desfeita antes do prazo escolhido.
      </label>

      <Button type="button" variant="danger" onClick={onSubmit} disabled={starting}>
        {starting ? 'Iniciando…' : 'Iniciar autoexclusão'}
      </Button>
    </div>
  )
}
