export interface CreateMatchParticipantInput {
  displayName: string
  userId?: string | null
}

// creatorId comes from the JWT, never the body. scheduledAt is an ISO 8601
// string on the wire; the controller turns it into a Date for the domain.
export interface CreateMatchInput {
  title: string
  // Leaf category the match belongs to (its id). Required.
  categoryId: string
  // Optional; the URL returned by the upload endpoint (e.g. /uploads/matchs/x.png).
  imageUrl?: string | null
  scheduledAt: string
  rakeBasisPoints?: number
  participants: CreateMatchParticipantInput[]
}

// All fields optional (patch). scheduledAt is an ISO 8601 string on the wire.
// Participants and image are not editable after creation.
export interface UpdateMatchInput {
  title?: string
  categoryId?: string
  scheduledAt?: string
}

export interface DeclareResultInput {
  winnerParticipantId: string
}
