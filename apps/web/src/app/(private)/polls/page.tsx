'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { CategoryPicker } from '@/components/category-picker'
import { ImagePicker } from '@/components/image-picker'
import { PollCard } from '@/components/poll-card'
import { usePollsPage } from './hooks/use-polls-page'
import { OPTION_PRESETS, MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from './data/option-presets'

export default function PollsPage() {
  const {
    isAdmin,
    polls,
    loading,
    categories,
    pathOf,
    form,
    options,
    addOption,
    removeOption,
    applyPreset,
    onSubmit,
    submitting,
  } = usePollsPage()

  return (
    <div className="animate-scrIn space-y-7">
      {isAdmin && (
        <form
          onSubmit={onSubmit}
          className="space-y-5 border-3 border-arcade-amber bg-arcade-surface p-6 shadow-pixel-lg"
        >
          <h2 className="font-pixel text-xs tracking-wide text-arcade-amber">ABRIR ENQUETE</h2>
          <Field label="PERGUNTA" required placeholder="Quando o fulano vai ser demitido?" {...form.register('question')} />

          <label className="block space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
              COMO VAI SER JULGADA
            </span>
            <textarea
              rows={3}
              required
              placeholder="Diga o que conta como resposta e qual é a fonte. Ex.: vale o anúncio oficial no grupo do trabalho; pedido de demissão não conta."
              className="w-full border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-lg leading-snug text-arcade-text outline-none focus:border-arcade-cyan"
              {...form.register('resolutionCriteria')}
            />
            <span className="block font-arcade text-base leading-snug text-arcade-text-muted">
              Isto NÃO pode ser editado depois. É o combinado que a galera aceita ao apostar — se
              estiver errado, só cancelando a enquete (todo mundo é estornado) e abrindo outra.
            </span>
          </label>

          <div className="space-y-2">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">CATEGORIA</span>
            <CategoryPicker
              categories={categories}
              value={form.watch('categoryId') || null}
              onChange={(leafId) => form.setValue('categoryId', leafId ?? '')}
            />
          </div>

          <Field label="APOSTAS ATÉ" type="datetime-local" required {...form.register('closesAt')} />
          <ImagePicker
            label="IMAGEM (OPCIONAL)"
            preset="banner"
            value={form.watch('image')}
            onChange={(file) => form.setValue('image', file)}
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
                OPÇÕES ({MIN_POLL_OPTIONS} A {MAX_POLL_OPTIONS})
              </span>
              {OPTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.options)}
                  className="border-2 border-arcade-border bg-[#0b0714] px-2.5 py-1 font-arcade text-base text-arcade-text-soft transition-colors hover:border-arcade-cyan"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <input
                  value={option}
                  onChange={(event) =>
                    form.setValue(
                      'options',
                      options.map((current, position) => (position === index ? event.target.value : current)),
                    )
                  }
                  placeholder={`Opção ${index + 1}`}
                  className="min-w-0 flex-1 border-3 border-arcade-border bg-[#0b0714] px-3 py-2.5 font-arcade text-xl text-arcade-text outline-none focus:border-arcade-cyan"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= MIN_POLL_OPTIONS}
                  aria-label={`Remover opção ${index + 1}`}
                  className="flex-none border-2 border-arcade-border px-3 py-2 font-pixel text-[10px] text-arcade-danger transition-colors hover:border-arcade-danger disabled:opacity-40"
                >
                  X
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              onClick={addOption}
              disabled={options.length >= MAX_POLL_OPTIONS}
            >
              + Opção
            </Button>
          </div>

          <Button type="submit" variant="warning" disabled={submitting}>
            {submitting ? 'Abrindo…' : 'Abrir enquete'}
          </Button>
        </form>
      )}

      <div className="space-y-3.5">
        <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">CHUTE E LEVE</h2>
        {loading ? (
          <Loading compact />
        ) : polls.length === 0 ? (
          <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
            Nenhuma enquete ainda.
          </p>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} categoryPath={pathOf(poll.categoryId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
