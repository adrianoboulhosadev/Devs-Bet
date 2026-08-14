// A participant snapshot ready for the domain: the backend resolves each
// participantId against the catalog (packages/participant) and fills in
// displayName/nickname/imageUrl — tournament never imports @participant/core.
export interface TournamentParticipantSnapshot {
  participantId: string
  displayName: string
  nickname?: string | null
  imageUrl?: string | null
}

// creatorId comes from the JWT, never the body. scheduledAt is an ISO 8601 string
// on the wire; the controller turns it into a Date. `size` must be a power of 2 in
// 2..128 and match the number of participants (enforced by the domain).
// participantIds are catalog ids picked in the admin's create-tournament form —
// the backend resolves them into TournamentParticipantSnapshot[] before calling
// the use case (see CreateTournamentController.execute).
export interface CreateTournamentInput {
  title: string
  // Leaf category the tournament belongs to (its id). Required.
  categoryId: string
  // Optional; the URL returned by the upload endpoint (e.g. /uploads/matchs/x.png).
  imageUrl?: string | null
  scheduledAt: string
  rakeBasisPoints?: number
  // How many units decide each round's confrontations, one entry per round —
  // its length must equal log2(size) (defaults to all 1s). E.g. every round
  // MD3 except an MD5 final: [3, 3, ..., 5].
  bestOfByRound?: number[]
  size: number
  participantIds: string[]
}

// The admin declares the winner of a bracket confrontation by the MatchParticipant
// id (as shown on the match); the backend resolves it to a displayName to advance.
export interface RecordBracketResultInput {
  winnerParticipantId: string
  // Photo proving the unit's result — mandatory, same as a standalone match's
  // RecordUnitResultInput.
  proofImageUrl: string
}
