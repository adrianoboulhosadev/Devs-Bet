/** Valid tournament sizes — powers of 2, mirroring Tournament's own list. */
export const TOURNAMENT_SIZES = [2, 4, 8, 16, 32, 64, 128]

/** bestOf option for a single round. Must match Match.VALID_BEST_OF. */
export const TOURNAMENT_BEST_OF_OPTIONS = [1, 3, 5] as const

/** Pre-selected size on the creation form. */
export const DEFAULT_TOURNAMENT_SIZE = 8
