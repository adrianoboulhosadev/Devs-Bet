/** READ projection (CQRS) of a participant, for the admin catalog list and the
 * picker used when creating a match/tournament. */
export interface ParticipantDTO {
  id: string
  name: string
  nickname: string | null
  imageUrl: string | null
}
