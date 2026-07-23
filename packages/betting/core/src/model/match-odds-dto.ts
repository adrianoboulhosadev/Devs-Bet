/** Live (indicative) odds for one participant, derived from the current pool. */
export interface ParticipantOdds {
  participantId: string
  pool: number // cents staked on this participant
  bettors: number // distinct bets on this participant
  impliedOdd: number // distributable / pool, 2 decimals (0 if no pool)
}

/**
 * READ model of a match's live odds (CQRS). Indicative while the match is open:
 * odds float with the money and freeze at settlement. `totalPool` is the sum of
 * all stakes; the underdog (smaller pool) shows the higher `impliedOdd`.
 */
export interface MatchOddsDTO {
  matchId: string
  totalPool: number
  entries: ParticipantOdds[]
}
