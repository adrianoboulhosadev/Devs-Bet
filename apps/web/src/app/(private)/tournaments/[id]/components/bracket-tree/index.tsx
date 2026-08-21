'use client'

import type { BracketSlotDTO, TournamentParticipantDTO } from '@tournament/adapters'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { BracketSlotCard } from '../bracket-slot-card'

interface BracketTreeProps {
  slots: BracketSlotDTO[]
  roundCount: number
  roundLabel: (round: number) => string
  bestOfByRound: number[]
  champion: TournamentParticipantDTO | null
}

const CONNECTOR = 'bg-arcade-border'

/**
 * O mata-mata desenhado como chave de copa do mundo: uma coluna por rodada,
 * ligadas por fios que juntam cada par de confrontos no confronto seguinte, até
 * a coluna do campeão.
 *
 * A chave inteira cabe na largura da tela em vez de rolar pro lado (era o que a
 * versão antiga fazia, com colunas de 224px e `min-w-max`): cada coluna é
 * `flex-1`, e no celular — onde 5 colunas seriam ilegíveis de qualquer jeito —
 * as rodadas empilham uma embaixo da outra, cada uma com seus confrontos em
 * largura cheia. Os fios só aparecem de `lg` pra cima, que é onde eles têm o que
 * ligar.
 */
export function BracketTree({ slots, roundCount, roundLabel, bestOfByRound, champion }: BracketTreeProps) {
  const rounds = Array.from({ length: roundCount }, (_, round) => round)
  const slotsOfRound = (round: number) =>
    slots
      .filter((slot) => slot.round === round)
      .sort((first, second) => first.position - second.position)

  const headingClass = 'font-pixel text-[10px] tracking-widest text-arcade-text-muted'

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-0">
      {rounds.map((round) => {
        const roundSlots = slotsOfRound(round)
        const bestOf = bestOfByRound[round] ?? 1

        return (
          <div key={round} className="flex flex-col gap-3 lg:min-w-0 lg:flex-1 lg:gap-0">
            <h3 className={`${headingClass} ${round > 0 ? 'lg:pl-4' : ''} lg:pr-4`}>
              {roundLabel(round).toUpperCase()}
              {bestOf > 1 && ` · MD${bestOf}`}
            </h3>

            {/* `lg:flex-1` em cada confronto é o que faz a chave convergir: os
                confrontos de uma rodada repartem a MESMA altura em fatias
                iguais, então o centro de cada card cai exatamente onde o fio da
                rodada anterior chega. */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:gap-0">
              {roundSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className={`relative flex items-center lg:flex-1 lg:py-1.5 lg:pr-4 ${round > 0 ? 'lg:pl-4' : ''}`}
                >
                  {round > 0 && (
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 hidden h-[3px] w-4 -translate-y-1/2 lg:block ${CONNECTOR}`}
                    />
                  )}

                  <BracketSlotCard slot={slot} />

                  <span
                    aria-hidden
                    className={`absolute right-0 top-1/2 hidden h-[3px] w-4 -translate-y-1/2 lg:block ${CONNECTOR}`}
                  />
                  {/* O fio vertical sobe (ímpar) ou desce (par) meia fatia até
                      encontrar o do irmão — juntos formam o "]" da chave. */}
                  {roundSlots.length > 1 && (
                    <span
                      aria-hidden
                      className={`absolute right-0 hidden h-1/2 w-[3px] lg:block ${CONNECTOR} ${
                        index % 2 === 0 ? 'top-1/2' : 'bottom-1/2'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex flex-col gap-3 lg:min-w-0 lg:flex-1 lg:gap-0">
        <h3 className={`${headingClass} text-arcade-amber lg:pl-4`}>CAMPEÃO</h3>
        <div className="relative flex items-center lg:flex-1 lg:py-1.5 lg:pl-4">
          <span
            aria-hidden
            className={`absolute left-0 top-1/2 hidden h-[3px] w-4 -translate-y-1/2 lg:block ${CONNECTOR}`}
          />
          <div className="flex w-full items-center gap-2.5 border-3 border-arcade-amber bg-arcade-surface px-2.5 py-3 shadow-pixel-sm">
            {champion ? (
              <ParticipantAvatar
                id={champion.participantId}
                name={champion.displayName}
                imageUrl={champion.imageUrl}
                className="h-9 w-9"
                textClassName="text-[8px]"
              />
            ) : (
              <span aria-hidden className="h-9 w-9 flex-none bg-arcade-border-strong" />
            )}
            <span
              title={champion?.displayName}
              className={`min-w-0 flex-1 truncate font-arcade text-lg ${
                champion ? 'text-arcade-amber' : 'text-arcade-text-muted'
              }`}
            >
              {champion?.displayName ?? 'A definir'}
            </span>
            <span aria-hidden className="font-pixel text-sm text-arcade-amber">
              ★
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
