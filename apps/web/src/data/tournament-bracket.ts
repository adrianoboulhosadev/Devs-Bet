// Shared by the tournament LIST and the tournament DETAIL — two different
// routes, so this is global data, not a route's. Both had their own copy of
// these two values (and of the math below, now in lib/tournament-bracket.ts).

/**
 * Above this size a round-robin group stage (groups of 4, top 2 advance) seeds
 * the knockout bracket instead of the tournament starting from it directly —
 * mirrors GROUP_STAGE_THRESHOLD in @tournament/adapters.
 */
export const GROUP_STAGE_THRESHOLD = 32

/**
 * Round names by distance to the final. '32-avos' only ever shows up for a
 * 128-size tournament, whose group stage yields a 64-entrant bracket.
 */
export const ROUND_LABELS = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '16-avos', '32-avos']
