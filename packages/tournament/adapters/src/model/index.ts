// Rich entities + domain services re-exported as VALUES: the app's Prisma
// repository reconstitutes the aggregate (`new Tournament({...})`) and the
// bracket helpers are used without importing @tournament/core. Adapters is the
// context's only public surface.
export {
  Tournament,
  TournamentParticipant,
  BracketSlot,
  BracketBuilder,
  BracketAdvancer,
  VALID_TOURNAMENT_SIZES,
} from '@tournament/core'
