'use client'

import { useQueries } from '@tanstack/react-query'
import type { MatchDTO } from '@match/adapters'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'

/** Um confronto do torneio (da chave ou de um grupo) com a Match que o representa. */
export interface Confrontation {
  matchId: string
  /** Onde ele acontece: "Semifinal", "Grupo 2"… */
  stage: string
  names: string[]
  match: MatchDTO | undefined
}

/**
 * TODAS as matches do torneio (chave + grupos) buscadas num lugar só. Antes cada
 * card do chaveamento disparava a própria query; com a chave virando uma árvore
 * compacta — cartão do tamanho de um nome, sem botão dentro —, quem precisa
 * saber o status de cada confronto é a TELA, não o cartão. É isso que permite
 * montar a lista única de "o que dá pra apostar agora".
 */
export function useTournamentMatches(
  tournament: TournamentDTO | undefined,
  roundLabel: (round: number) => string,
) {
  const scheduled = [
    ...(tournament?.bracket ?? [])
      .filter((slot) => slot.matchId)
      .map((slot) => ({
        matchId: slot.matchId as string,
        stage: roundLabel(slot.round),
        names: [slot.playerA?.displayName ?? 'A definir', slot.playerB?.displayName ?? 'A definir'],
      })),
    ...(tournament?.groups ?? []).flatMap((group) =>
      group.matches
        .filter((groupMatch) => groupMatch.matchId)
        .map((groupMatch) => ({
          matchId: groupMatch.matchId as string,
          stage: `Grupo ${group.groupIndex + 1}`,
          names: [groupMatch.playerA.displayName, groupMatch.playerB.displayName],
        })),
    ),
  ]

  const queries = useQueries({
    queries: scheduled.map((confrontation) => ({
      queryKey: ['match', confrontation.matchId],
      queryFn: async (): Promise<MatchDTO> =>
        (await api.get<MatchDTO>(`/match/${confrontation.matchId}`)).data,
    })),
  })

  const byId = new Map<string, MatchDTO>()
  queries.forEach((query, index) => {
    if (query.data) byId.set(scheduled[index].matchId, query.data)
  })

  return {
    matchOf: (matchId: string | null): MatchDTO | undefined => (matchId ? byId.get(matchId) : undefined),
    // Só o que o apostador ainda pode fazer alguma coisa a respeito: a chave em
    // si não tem mais botão de apostar, essa lista é que carrega os botões.
    openConfrontations: scheduled
      .map((confrontation): Confrontation => ({ ...confrontation, match: byId.get(confrontation.matchId) }))
      .filter((confrontation) => confrontation.match?.status === 'open'),
  }
}
