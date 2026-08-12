// Rich entity re-exported as a VALUE: the apps' Prisma repositories reconstitute
// it (`new Notification({...})`) without importing @notification/core. Adapters
// is the context's only public surface.
export { Notification } from '@notification/core'
