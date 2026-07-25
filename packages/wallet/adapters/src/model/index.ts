// Rich entities re-exported as VALUES: the app's Prisma repository reconstitutes
// them (`new Wallet({...})`, `new Payment({...})`, `new LedgerEntry({...})`,
// `new DepositLimit({...})`, `new SelfExclusion({...})`) without importing
// @wallet/core. Adapters is the context's only public surface.
export { Wallet, LedgerEntry, Payment, DepositLimit, SelfExclusion } from '@wallet/core'
