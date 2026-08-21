'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { BracketSlotDTO, TournamentParticipantDTO } from '@tournament/adapters'
import type { MatchDTO } from '@match/adapters'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { ParticipantAvatar } from '@/components/participant-avatar'

interface BracketSlotCardProps {
  slot: BracketSlotDTO
}

interface BracketSideProps {
  player: TournamentParticipantDTO | null
  /** Já se sabe quem passou neste confronto? */
  decided: boolean
  won: boolean
  /** Unidades vencidas — só num confronto de MD3/MD5; `null` esconde a coluna. */
  units: number | null
}

/**
 * Um lado do confronto: foto, nome e (num MD3/MD5) as unidades vencidas — a
 * mesma leitura de uma chave de copa do mundo, onde o jogador é reconhecido
 * pela cara antes do nome.
 */
function BracketSide({ player, decided, won, units }: BracketSideProps) {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-2 ${won ? 'bg-[#2a1150]' : ''}`}>
      {player ? (
        <ParticipantAvatar
          id={player.participantId}
          name={player.displayName}
          imageUrl={player.imageUrl}
          className="h-9 w-9"
          textClassName="text-[8px]"
        />
      ) : (
        <span aria-hidden className="h-9 w-9 flex-none bg-arcade-border-strong" />
      )}

      {/* `truncate` + `title`: numa chave de 6 rodadas a coluna fica estreita, e
          um nome comprido esticaria o card por cima do vizinho. */}
      <span
        title={player?.displayName}
        className={`min-w-0 flex-1 truncate font-arcade text-lg ${
          won ? 'text-arcade-lime' : decided ? 'text-arcade-text-muted' : 'text-arcade-text'
        }`}
      >
        {player?.displayName ?? 'A definir'}
      </span>

      {units !== null && (
        <span className={`font-pixel text-[10px] ${won ? 'text-arcade-lime' : 'text-arcade-text-muted'}`}>
          {units}
        </span>
      )}
    </div>
  )
}

/**
 * One confrontation in the bracket. When a Match is attached, it fetches it to
 * show the live status and a link into the match page — declaring the winner
 * happens there now (the match's own "Sala de Controle"), never from this
 * card, so there is exactly one place that can define a result.
 */
export function BracketSlotCard({ slot }: BracketSlotCardProps) {
  const match = useQuery({
    queryKey: ['match', slot.matchId],
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${slot.matchId}`)).data,
    enabled: Boolean(slot.matchId),
  })

  const status = match.data?.status
  const bestOf = match.data?.bestOf ?? 1
  // O vencedor vem como id de MatchParticipant, que é uma CÓPIA do participante
  // do torneio (ver a seção match do CLAUDE.md) — o que liga os dois é o id do
  // catálogo, não o id da linha.
  const winner = match.data?.participants.find(
    (participant) => participant.id === match.data?.winnerParticipantId,
  )
  const sideOf = (player: TournamentParticipantDTO | null) =>
    match.data?.participants.find((participant) => participant.participantId === player?.participantId)
  const unitsOf = (player: TournamentParticipantDTO | null): number | null => {
    const side = sideOf(player)
    if (!match.data || bestOf < 2 || !side) return null
    return match.data.units.filter((unit) => unit.winnerParticipantId === side.id).length
  }
  const hasWon = (player: TournamentParticipantDTO | null): boolean =>
    Boolean(winner && player && winner.participantId === player.participantId)

  return (
    <div className="w-full border-3 border-arcade-border bg-arcade-surface shadow-pixel-sm">
      <BracketSide
        player={slot.playerA}
        decided={Boolean(winner)}
        won={hasWon(slot.playerA)}
        units={unitsOf(slot.playerA)}
      />
      <div aria-hidden className="h-px bg-arcade-border-strong" />
      <BracketSide
        player={slot.playerB}
        decided={Boolean(winner)}
        won={hasWon(slot.playerB)}
        units={unitsOf(slot.playerB)}
      />

      {slot.matchId ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t-3 border-arcade-border-strong px-2.5 py-1.5 font-arcade text-base">
          {status ? <StatusBadge status={status} /> : <span className="text-arcade-text-muted">…</span>}
          <Link href={`/matches/${slot.matchId}`} className="text-arcade-cyan hover:underline">
            Ver / Apostar →
          </Link>
        </div>
      ) : (
        <p className="border-t-3 border-arcade-border-strong px-2.5 py-1.5 font-arcade text-base text-arcade-text-muted">
          Aguardando confronto anterior.
        </p>
      )}
    </div>
  )
}
