/** READ projection (CQRS): one bettor's XP/level progress and win/loss tally. */
export interface ProfileStatsDTO {
  wins: number
  losses: number
  xp: number
  level: number
  xpIntoLevel: number
  xpToNextLevel: number
}
