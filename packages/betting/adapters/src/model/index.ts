// Rich entities re-exported as VALUES: the app's Prisma repositories reconstitute
// bets/combo tickets/stake limits (`new Bet({...})`/`new ComboBet({...})`/
// `new StakeLimit({...})`). Adapters is the context's only public surface.
export { Bet, ComboBet, StakeLimit } from '@betting/core'
