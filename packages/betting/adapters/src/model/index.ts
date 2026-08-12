// Rich entities re-exported as VALUES: the app's Prisma repositories reconstitute
// bets/combo tickets/stake limits (`new Bet({...})`/`new ComboBet({...})`/
// `new StakeLimit({...})`). Adapters is the context's only public surface.
export { Bet, ComboBet, StakeLimit } from '@betting/core'
// Domain event classes, re-exported as VALUES so an app-layer listener can
// `instanceof` against the real class, not just a structural type.
export { BetWon, BetLost, BetRefunded, ComboWon, ComboLost, ComboRefunded } from '@betting/core'
