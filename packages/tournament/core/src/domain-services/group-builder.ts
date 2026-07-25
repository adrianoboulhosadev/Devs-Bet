import { ValidationError, Errors } from 'shared'

// Group size is fixed at 4 (6 round-robin matchups per group) — see CLAUDE.md.
export const GROUP_SIZE = 4
// Tournaments at or below this size play a pure knockout bracket from the raw
// participants (unchanged); above it, a round-robin group stage seeds the
// knockout bracket with each group's top two instead (Tournament.hasGroupStage).
export const GROUP_STAGE_THRESHOLD = 32

/** Plain descriptor of one group-stage matchup, turned into a GroupMatchSlot by
 * the Tournament aggregate. groupIndex is 0-based; matchupIndex (0..5) is which
 * of the group's 6 round-robin pairings this is — both are stable identifiers,
 * not an ordering. */
export interface GroupMatchSeed {
  groupIndex: number
  matchupIndex: number
  playerAId: string
  playerBId: string
}

/**
 * Pure domain service (no ports, no side effects) that lays out the group
 * stage: participants split into consecutive groups of GROUP_SIZE (in the
 * order given — no seeding requested), each group playing every pairwise
 * round-robin matchup. Static, like BracketBuilder.
 */
export class GroupBuilder {
  static groupCount(size: number): number {
    return size / GROUP_SIZE
  }

  static build(size: number, participantIds: string[]): GroupMatchSeed[] {
    if (size % GROUP_SIZE !== 0) {
      ValidationError.throwError(Errors.INVALID_TOURNAMENT_SIZE, size)
    }
    if (participantIds.length !== size) {
      ValidationError.throwError(Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS, participantIds.length)
    }

    const groupCount = GroupBuilder.groupCount(size)
    const seeds: GroupMatchSeed[] = []
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
      const members = participantIds.slice(groupIndex * GROUP_SIZE, (groupIndex + 1) * GROUP_SIZE)
      let matchupIndex = 0
      for (let first = 0; first < members.length; first++) {
        for (let second = first + 1; second < members.length; second++) {
          seeds.push({
            groupIndex,
            matchupIndex: matchupIndex++,
            playerAId: members[first],
            playerBId: members[second],
          })
        }
      }
    }
    return seeds
  }

  /**
   * Seeds the knockout bracket from each group's top two, pairing consecutive
   * groups CROSSWISE (group N's 1st vs group N+1's 2nd, group N+1's 1st vs
   * group N's 2nd) so a group's own pair can never meet in the bracket's first
   * round. The result feeds BracketBuilder.build, which pairs adjacent entries
   * ([0]v[1], [2]v[3], ...).
   */
  static seedKnockoutEntrants(topTwoPerGroup: [string, string][]): string[] {
    const entrants: string[] = []
    for (let pair = 0; pair < topTwoPerGroup.length; pair += 2) {
      const [firstRank1, firstRank2] = topTwoPerGroup[pair]
      const partner = topTwoPerGroup[pair + 1]
      if (!partner) {
        // Odd group count — not reachable for the supported sizes (64 → 16
        // groups, 128 → 32 groups), kept only as a defensive fallback.
        entrants.push(firstRank1, firstRank2)
        continue
      }
      const [partnerRank1, partnerRank2] = partner
      entrants.push(firstRank1, partnerRank2, partnerRank1, firstRank2)
    }
    return entrants
  }
}
