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
  // How many units decide the match — 1, 3 or 5 (defaults to 1).
  bestOf?: number
  // Whether this match can end in a draw (defaults to true). Only legal when
  // bestOf is 1. A tournament confrontation is created with this false — it
  // must always advance the bracket with a real winner.
  allowsDraw?: boolean
  participants: CreateMatchParticipantInput[]
}

// All fields optional (patch). scheduledAt is an ISO 8601 string on the wire.
// Participants and image are not editable after creation.
export interface UpdateMatchInput {
  title?: string
  categoryId?: string
  scheduledAt?: string
}

// The unit number is never sent by the caller — the use case always records
// "whatever unit comes next" on the match.
export interface RecordUnitResultInput {
  // null declares a draw (match only — a tournament confrontation always
  // requires a real winner, enforced by RecordBracketResultInput).
  winnerParticipantId: string | null
}
