'use client'

import Link from 'next/link'
import type { BracketSlotDTO, TournamentParticipantDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { ParticipantAvatar } from '@/components/participant-avatar'
import { CONFRONTATION_BAR_BY_STATUS, CONFRONTATION_BAR_PENDING } from '../../data/confrontation-status'

interface BracketSlotCardProps {
  slot: BracketSlotDTO
  /** A Match do confronto, buscada de uma vez pela tela (useTournamentMatches). */
  match: MatchDTO | undefined
}

/**
 * Um confronto dentro da chave, no formato de chaveamento de copa: uma linha por
 * jogador, foto + nome, e uma faixa de cor dizendo o status. Todo o texto que
 * havia aqui (badge escrito, placar, link "Ver / Apostar") saiu — era ele que
 * fazia cada coluna precisar de ~224px e obrigava a rolar a chave pro lado no
 * celular. O cartão inteiro virou o link pra partida, onde esses dados moram.
 *
 * ⚠️ A ALTURA do cartão é fixa por construção (faixa + duas linhas `h-8`): as
 * linhas que ligam a chave só caem no lugar porque todos os cartões medem o
 * mesmo. Nada de conteúdo condicional que mude a altura aqui dentro.
 */
export function BracketSlotCard({ slot, match }: BracketSlotCardProps) {
  // O vencedor vem da Match, cujo `winnerParticipantId` é o id de um
  // MatchParticipant — a ponte até o participante do torneio é o id do CATÁLOGO,
  // que os dois lados carregam.
  const winnerId = match?.winnerParticipantId ?? null
  const winnerCatalogId =
    match?.participants.find((participant) => participant.id === winnerId)?.participantId ?? null
  const players: (TournamentParticipantDTO | null)[] = [slot.playerA, slot.playerB]

  const card = (
    <div className="w-full border-2 border-arcade-border bg-arcade-surface">
      <span
        className={`block h-1 ${match ? CONFRONTATION_BAR_BY_STATUS[match.status] : CONFRONTATION_BAR_PENDING}`}
      />
      {players.map((player, index) => {
        const won = player !== null && winnerCatalogId !== null && winnerCatalogId === player.participantId
        return (
          <div
            key={player?.id ?? `empty-${index}`}
            className={`flex h-8 items-center gap-1 px-1 sm:gap-1.5 sm:px-1.5 ${
              index === 1 ? 'border-t-2 border-arcade-border-strong' : ''
            } ${won ? 'bg-[#1f2a10]' : ''}`}
          >
            {player ? (
              <ParticipantAvatar
                id={player.participantId}
                name={player.displayName}
                imageUrl={player.imageUrl}
                className="h-4 w-4 sm:h-5 sm:w-5"
                textClassName="text-[7px]"
              />
            ) : (
              <span className="h-4 w-4 flex-none bg-arcade-border-strong sm:h-5 sm:w-5" />
            )}
            <span
              className={`min-w-0 truncate font-arcade text-sm sm:text-base ${
                won ? 'text-arcade-lime' : player ? 'text-arcade-text' : 'text-arcade-text-muted'
              }`}
            >
              {player?.displayName ?? 'A definir'}
            </span>
          </div>
        )
      })}
    </div>
  )

  if (!slot.matchId) return card

  return (
    <Link
      href={`/matches/${slot.matchId}`}
      // O title é o que devolve, no hover, o nome inteiro que o `truncate` corta
      // numa coluna estreita.
      title={`${slot.playerA?.displayName ?? 'A definir'} vs ${slot.playerB?.displayName ?? 'A definir'}`}
      className="block w-full transition-transform hover:-translate-y-0.5"
    >
      {card}
    </Link>
  )
}
