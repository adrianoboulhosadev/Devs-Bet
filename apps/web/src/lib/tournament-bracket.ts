import { GROUP_STAGE_THRESHOLD, ROUND_LABELS } from '@/data/tournament-bracket'

/**
 * The knockout bracket's actual entrant count: everyone below the group-stage
 * threshold, or each group's top two above it (see Tournament.qualifierCount).
 */
export const qualifierCountOf = (size: number): number =>
  size > GROUP_STAGE_THRESHOLD ? size / 2 : size

/**
 * How many knockout rounds the bracket has. Not `log2(size)` when there is a
 * group stage: the bracket only starts once the groups narrow the field down to
 * the qualifiers.
 */
export const roundCountOf = (size: number): number => {
  const qualifiers = qualifierCountOf(size)
  return qualifiers >= 2 ? Math.log2(qualifiers) : 0
}

/** Falls back to a plain number when the bracket runs deeper than the label list. */
export const roundLabelOf = (round: number, roundCount: number): string =>
  ROUND_LABELS[roundCount - 1 - round] ?? `Rodada ${round + 1}`
