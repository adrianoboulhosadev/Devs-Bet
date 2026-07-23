// Rich entities re-exported as VALUES: the app's Prisma repository reconstitutes
// them (`new Match({...})`) without importing @match/core. Adapters is the
// context's only public surface.
export { Match, MatchParticipant } from '@match/core'
