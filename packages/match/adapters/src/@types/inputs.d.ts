export interface CreateMatchParticipantInput {
  displayName: string
  userId?: string | null
}

// creatorId comes from the JWT, never the body.
export interface CreateMatchInput {
  title: string
  gameType?: string | null
  rakeBasisPoints?: number
  participants: CreateMatchParticipantInput[]
}

export interface DeclareResultInput {
  winnerParticipantId: string
}
