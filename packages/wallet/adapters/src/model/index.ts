// Rich entities re-exported as VALUES: the app's Prisma repository reconstitutes
// them (`new Wallet({...})`, `new Payment({...})`, `new LedgerEntry({...})`,
// `new DepositLimit({...})`, `new SelfExclusion({...})`) without importing
// @wallet/core. Adapters is the context's only public surface.
export { Wallet, LedgerEntry, Payment, DepositLimit, SelfExclusion } from '@wallet/core'
// Domain event classes, re-exported as VALUES so an app-layer listener can
// `instanceof` against the real class, not just a structural type.
export {
  DepositRequested,
  WithdrawalRequested,
  DepositConfirmed,
  WithdrawalPaid,
  PaymentRejected,
} from '@wallet/core'
