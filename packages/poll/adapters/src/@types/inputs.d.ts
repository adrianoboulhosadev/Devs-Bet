// creatorId comes from the JWT, never the body. closesAt is an ISO 8601 string
// on the wire; the controller turns it into a Date for the domain.
export interface CreatePollInput {
  question: string
  // How this poll will be judged, and by which source. Required, and frozen
  // once created — it is the contract the bettors accepted.
  resolutionCriteria: string
  // Leaf category the poll belongs to (its id). Required.
  categoryId: string
  // Optional; the URL returned by the upload endpoint (e.g. /uploads/polls/x.png).
  imageUrl?: string | null
  closesAt: string
  rakeBasisPoints?: number
  // Two to ten distinct answers. A yes/no poll is just the two-option case —
  // the front pre-fills them, the domain never branches.
  options: { label: string }[]
}

// The ONLY editable detail of a poll, and only while it is still open.
export interface ReschedulePollInput {
  closesAt: string
}

// Which answer turned out to be right — one of the poll's own option ids.
export interface ResolvePollInput {
  winningOptionId: string
}
