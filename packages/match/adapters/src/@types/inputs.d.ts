export interface CreateMatchParticipantInput {
  displayName: string
  userId?: string | null
}

// creatorId comes from the JWT, never the body. scheduledAt is an ISO 8601
// string on the wire; the controller turns it into a Date for the domain.
export interface CreateMatchInput {
  title: string
  gameType?: string | null
  scheduledAt: string
  rakeBasisPoints?: number
  participants: CreateMatchParticipantInput[]
}

export interface DeclareResultInput {
  winnerParticipantId: string
}
