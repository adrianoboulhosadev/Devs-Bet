// Rich domain entities re-exported as VALUES (they are classes, not interfaces):
// the app's driven adapters (Prisma repositories) reconstitute them via the
// constructor — `new User({...})` — without importing @auth/core. Adapters is the
// only public surface of the context.
export { User, AuthSession } from '@auth/core'
