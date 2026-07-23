/** Stake in CENTS. bettorId comes from the JWT; match status/participants are
 * resolved from the match context by the backend, not sent by the client. */
export interface PlaceBetInput {
  matchId: string
  participantId: string
  stake: number
}
