/** READ projection (CQRS): one bettor's row in the leaderboard. */
export interface LeaderboardEntryDTO {
  bettorId: string
  betsSettled: number
  betsWon: number
  totalStaked: number // cents
  totalPayout: number // cents
  netProfit: number // cents (totalPayout - totalStaked across settled bets)
}
