'use client'

import Link from 'next/link'
import { Button } from '@/components/button'
import { formatDateTime } from '@/lib/date'
import type { Confrontation } from '../../hooks/use-tournament-matches'

interface OpenConfrontationsProps {
  confrontations: Confrontation[]
}

/**
 * Onde o botão de apostar foi parar depois que a chave virou uma árvore de
 * cartõezinhos: uma lista só, com os confrontos que ainda aceitam aposta — de
 * chave e de grupo, os dois. Além de caber num cartão de largura normal, ela
 * responde a pergunta que a chave não responde ("em qual desses dá pra apostar
 * agora?") sem obrigar ninguém a caçar cor de faixa pela árvore.
 */
export function OpenConfrontations({ confrontations }: OpenConfrontationsProps) {
  if (confrontations.length === 0) return null

  return (
    <div className="space-y-2.5">
      <h2 className="font-pixel text-[13px] tracking-wide text-arcade-text">PRA APOSTAR AGORA</h2>
      <ul className="space-y-2.5">
        {confrontations.map((confrontation) => (
          <li
            key={confrontation.matchId}
            className="flex flex-col items-start gap-3 border-3 border-arcade-border bg-arcade-surface p-3.5 shadow-pixel-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-pixel text-[9px] tracking-widest text-arcade-lime">
                {confrontation.stage.toUpperCase()}
                {confrontation.match && confrontation.match.bestOf > 1 && ` · MD${confrontation.match.bestOf}`}
              </p>
              <p className="mt-1.5 break-words font-arcade text-xl text-arcade-text">
                {confrontation.names.join(' vs ')}
              </p>
              {confrontation.match && (
                <p className="font-arcade text-base text-arcade-text-muted">
                  {formatDateTime(confrontation.match.scheduledAt)}
                </p>
              )}
            </div>
            <Link href={`/matches/${confrontation.matchId}`} className="flex-none">
              <Button variant="primary">Ver / Apostar</Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
