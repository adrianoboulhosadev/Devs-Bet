// Rich entities re-exported as VALUES: the app's Prisma repository reconstitutes
// them (`new Poll({...})`) without importing @poll/core. Adapters is the
// context's only public surface.
export { Poll, PollOption, PollQuestion, PollOptionLabel, ResolutionCriteria } from '@poll/core'
