// Rich entities + domain services re-exported as VALUES: the app's Prisma
// repository reconstitutes the aggregate (`new Tournament({...})`) and the
// bracket helpers are used without importing @tournament/core. Adapters is the
// context's only public surface.
export {
  Tournament,
  TournamentParticipant,
  BracketSlot,
  GroupMatchSlot,
  BracketBuilder,
  BracketAdvancer,
  GroupBuilder,
  GroupStandingsCalculator,
  VALID_TOURNAMENT_SIZES,
  GROUP_STAGE_THRESHOLD,
  GROUP_SIZE,
} from '@tournament/core'
