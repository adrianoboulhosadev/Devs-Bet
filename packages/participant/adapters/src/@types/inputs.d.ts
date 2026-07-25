export interface CreateParticipantInput {
  name: string
  nickname?: string | null
  // Optional; the URL returned by the upload endpoint (e.g. /uploads/participants/x.png).
  imageUrl?: string | null
}

// All fields optional (patch).
export interface UpdateParticipantInput {
  name?: string
  nickname?: string | null
  imageUrl?: string | null
}
