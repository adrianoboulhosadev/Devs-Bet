// Rich entities re-exported as VALUES: the app's Prisma repositories reconstitute
// bets/combo tickets (`new Bet({...})`/`new ComboBet({...})`). Adapters is the
// context's only public surface.
export { Bet, ComboBet } from '@betting/core'
