'use client'

import type { BracketSlotDTO, TournamentParticipantDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { BracketSlotCard } from '../bracket-slot-card'
import { CONFRONTATION_BAR_BY_STATUS, CONFRONTATION_LEGEND } from '../../data/confrontation-status'

interface BracketTreeProps {
  slots: BracketSlotDTO[]
  roundCount: number
  roundLabel: (round: number) => string
  bestOfByRound: number[]
  matchOf: (matchId: string | null) => MatchDTO | undefined
  champion: TournamentParticipantDTO | null
}

// Mesma linguagem pixel-art dos ícones da sidebar: uma grade 16x16 de rects.
const TrophyIcon = () => (
  <svg viewBox="0 0 16 16" width={26} height={26} fill="currentColor" className="shrink-0">
    <rect x="3" y="2" width="10" height="2" />
    <rect x="4" y="4" width="8" height="4" />
    <rect x="5" y="8" width="6" height="2" />
    <rect x="1" y="3" width="2" height="3" />
    <rect x="13" y="3" width="2" height="3" />
    <rect x="7" y="10" width="2" height="2" />
    <rect x="4" y="12" width="8" height="2" />
  </svg>
)

/**
 * A chave inteira como um chaveamento de copa: colunas por rodada, cartões
 * ligados por linhas e o troféu no fim.
 *
 * O que faz as LINHAS caírem no lugar sem medir nada em JavaScript: toda coluna
 * é uma flexbox de altura igual (a linha é `items-stretch`) e cada confronto
 * ocupa uma célula `flex-1`, então as células de uma mesma coluna têm todas a
 * mesma altura e a célula da rodada seguinte fica exatamente no meio do par que
 * a alimenta. Como o centro de duas células vizinhas dista exatamente UMA
 * altura de célula, a barra que une o par é um `h-full` a partir do meio da
 * célula de cima — sem conta nenhuma, em qualquer profundidade de chave.
 * (É por isso que o cartão precisa ter altura fixa; ver o aviso lá.)
 *
 * As colunas são `flex-1` com um piso estreito: numa chave de até 8 a chave
 * inteira cabe na tela do celular, sem rolagem lateral — que era a reclamação.
 * De 16 em diante ela ainda rola, mas o `overflow-x-auto` fica só como rede.
 */
export function BracketTree({
  slots,
  roundCount,
  roundLabel,
  bestOfByRound,
  matchOf,
  champion,
}: BracketTreeProps) {
  const rounds = Array.from({ length: roundCount }, (_, round) => round)
  const slotsOfRound = (round: number) =>
    slots.filter((slot) => slot.round === round).sort((first, second) => first.position - second.position)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-2.5 sm:gap-5">
          {rounds.map((round) => (
            <div key={round} className="flex min-w-[84px] flex-1 flex-col sm:min-w-[150px]">
              <h3 className="mb-2 truncate text-center font-pixel text-[8px] tracking-widest text-arcade-text-muted sm:text-[10px]">
                {roundLabel(round).toUpperCase()}
                {bestOfByRound[round] > 1 && ` · MD${bestOfByRound[round]}`}
              </h3>
              <div className="flex flex-1 flex-col">
                {slotsOfRound(round).map((slot, index) => (
                  // O `py` é o respiro entre um confronto e o seguinte (na
                  // rodada mais cheia os cartões se encostariam). Ele entra na
                  // ALTURA da célula, então continua valendo que o centro de
                  // duas células vizinhas dista uma altura de célula — as
                  // linhas seguem caindo no lugar.
                  <div key={slot.id} className="relative flex flex-1 items-center py-1">
                    {round > 0 && (
                      <span
                        aria-hidden
                        className="absolute right-full top-1/2 w-[5px] border-t-2 border-arcade-border sm:w-[10px]"
                      />
                    )}
                    <span
                      aria-hidden
                      className="absolute left-full top-1/2 w-[5px] border-t-2 border-arcade-border sm:w-[10px]"
                    />
                    {/* A barra que une o par só existe enquanto há uma rodada
                        seguinte pra receber o vencedor — na final ela desceria
                        pra lugar nenhum. */}
                    {round < roundCount - 1 && index % 2 === 0 && (
                      <span
                        aria-hidden
                        className="absolute left-[calc(100%+5px)] top-1/2 h-full border-l-2 border-arcade-border sm:left-[calc(100%+10px)]"
                      />
                    )}
                    <BracketSlotCard slot={slot} match={matchOf(slot.matchId)} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex w-11 flex-none flex-col sm:w-16">
            <h3 className="mb-2 truncate text-center font-pixel text-[8px] tracking-widest text-arcade-amber sm:text-[10px]">
              TAÇA
            </h3>
            <div className="relative flex flex-1 items-center justify-center">
              <span
                aria-hidden
                className="absolute right-full top-1/2 w-[5px] border-t-2 border-arcade-border sm:w-[10px]"
              />
              <div className="flex w-full min-w-0 flex-col items-center gap-1 text-arcade-amber">
                <TrophyIcon />
                {champion ? (
                  <>
                    <ParticipantAvatar
                      id={champion.participantId}
                      name={champion.displayName}
                      imageUrl={champion.imageUrl}
                      className="h-6 w-6"
                      textClassName="text-[7px]"
                    />
                    <span className="w-full truncate text-center font-arcade text-base text-arcade-lime">
                      {champion.displayName}
                    </span>
                  </>
                ) : (
                  <span className="font-pixel text-[8px] text-arcade-text-muted">?</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-arcade text-base text-arcade-text-muted">
        {CONFRONTATION_LEGEND.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 ${CONFRONTATION_BAR_BY_STATUS[entry.status]}`} />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
