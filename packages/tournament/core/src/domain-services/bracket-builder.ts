import { ValidationError, Errors } from 'shared'

/** A single-elimination bracket only supports these sizes (powers of 2). Above
 * GROUP_STAGE_THRESHOLD (32, see group-builder.ts) the knockout bracket is fed
 * by a round-robin group stage instead of starting from the raw participants —
 * see Tournament.hasGroupStage. */
export const VALID_TOURNAMENT_SIZES = [2, 4, 8, 16, 32, 64, 128] as const

/** Plain descriptor of a bracket slot, produced by the builder and turned into a
 * BracketSlot by the Tournament aggregate. Round 0 is the fullest round; the last
 * round is the final. Positions are 0-based within a round. */
export interface BracketSlotSeed {
  round: number
  position: number
  playerAId: string | null
  playerBId: string | null
}

/**
 * Pure domain service (no ports, no side effects) that lays out a single-
 * elimination bracket. Round 0 pairs the participants in order (adjacent
 * seeding: [0]v[1], [2]v[3], …); every later round is created empty, its winners
 * filled in by BracketAdvancer as matches settle. Static like `Id`/`Validator`.
 */
export class BracketBuilder {
  /** Number of rounds for a bracket of `size` (log2). 8 → 3 (quarters, semis, final). */
  static roundCount(size: number): number {
    return Math.log2(size)
  }

  static build(size: number, participantIds: string[]): BracketSlotSeed[] {
    if (!VALID_TOURNAMENT_SIZES.includes(size as (typeof VALID_TOURNAMENT_SIZES)[number])) {
      ValidationError.throwError(Errors.INVALID_TOURNAMENT_SIZE, size)
    }
    if (participantIds.length !== size) {
      ValidationError.throwError(Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS, participantIds.length)
    }

    const rounds = BracketBuilder.roundCount(size)
    const seeds: BracketSlotSeed[] = []
    for (let round = 0; round < rounds; round++) {
      const slotsInRound = size / 2 ** (round + 1)
      for (let position = 0; position < slotsInRound; position++) {
        seeds.push({
          round,
          position,
          // Only the first round starts with its two players known.
          playerAId: round === 0 ? participantIds[position * 2] : null,
          playerBId: round === 0 ? participantIds[position * 2 + 1] : null,
        })
      }
    }
    return seeds
  }
}
