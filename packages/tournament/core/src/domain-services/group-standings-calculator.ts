/** Structural shape a settled (or pending) group matchup must have to be
 * ranked — satisfied by both the GroupMatchSlot entity and a plain DB row, so
 * the read side can rank standings without touching the entity. */
export interface GroupMatchResult {
  playerAId: string
  playerBId: string
  winnerParticipantId: string | null
  unitsWonByA: number
  unitsWonByB: number
}

export interface GroupStandingEntry {
  participantId: string
  wins: number
  unitsWon: number
  unitsLost: number
}

/**
 * Pure domain service (no ports, no side effects) that ranks a single group's
 * standings from its round-robin matches. Unsettled matches (winnerParticipantId
 * null) are ignored, so this also works as a LIVE standings view mid-group-stage.
 * Tiebreak order (fixed, per product decision): 1) wins; 2) head-to-head wins
 * among only the still-tied players; 3) overall unit differential (units won
 * minus units lost, across the whole group — not just the head-to-head games);
 * 4) participantId, so the order is fully deterministic even if 1-3 all tie.
 */
export class GroupStandingsCalculator {
  static calculate(participantIds: string[], matches: GroupMatchResult[]): GroupStandingEntry[] {
    const settled = matches.filter((match) => match.winnerParticipantId !== null)

    const entries = new Map<string, GroupStandingEntry>(
      participantIds.map((participantId) => [
        participantId,
        { participantId, wins: 0, unitsWon: 0, unitsLost: 0 },
      ]),
    )

    for (const match of settled) {
      const winner = entries.get(match.winnerParticipantId!)
      if (winner) winner.wins += 1

      const entryA = entries.get(match.playerAId)
      if (entryA) {
        entryA.unitsWon += match.unitsWonByA
        entryA.unitsLost += match.unitsWonByB
      }
      const entryB = entries.get(match.playerBId)
      if (entryB) {
        entryB.unitsWon += match.unitsWonByB
        entryB.unitsLost += match.unitsWonByA
      }
    }

    const headToHeadWins = (participantId: string, clusterIds: Set<string>): number =>
      settled.filter(
        (match) =>
          match.winnerParticipantId === participantId &&
          ((match.playerAId === participantId && clusterIds.has(match.playerBId)) ||
            (match.playerBId === participantId && clusterIds.has(match.playerAId))),
      ).length

    const ranked = [...entries.values()].sort((first, second) => second.wins - first.wins)

    // Resolve ties cluster by cluster (players sharing the exact same win count).
    let index = 0
    while (index < ranked.length) {
      let end = index + 1
      while (end < ranked.length && ranked[end].wins === ranked[index].wins) end++

      if (end - index > 1) {
        const clusterIds = new Set(ranked.slice(index, end).map((entry) => entry.participantId))
        const cluster = ranked.slice(index, end).sort((first, second) => {
          const headToHeadDiff =
            headToHeadWins(second.participantId, clusterIds) - headToHeadWins(first.participantId, clusterIds)
          if (headToHeadDiff !== 0) return headToHeadDiff

          const diffFirst = first.unitsWon - first.unitsLost
          const diffSecond = second.unitsWon - second.unitsLost
          if (diffFirst !== diffSecond) return diffSecond - diffFirst

          return first.participantId < second.participantId ? -1 : 1
        })
        ranked.splice(index, end - index, ...cluster)
      }
      index = end
    }

    return ranked
  }
}
