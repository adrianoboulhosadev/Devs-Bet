import { AuthenticatedActor, AccessDeniedError, Errors, ConflictError, ValidationError } from 'shared'
import {
  CreateMatch,
  UpdateMatch,
  LockMatch,
  AutoLockMatch,
  DeclareMatchResult,
  CancelMatch,
  GetMatchQuery,
  ListMatchesQuery,
} from '../src'
import { MatchRepositoryInMemory, MatchLockQueueInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

async function setupWithMatch() {
  const repository = new MatchRepositoryInMemory()
  const lockQueue = new MatchLockQueueInMemory()
  const scheduledAt = inOneHour()
  await new CreateMatch(repository, lockQueue).execute(
    {
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      categoryIsLeaf: true,
      scheduledAt,
      participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
    },
    admin,
  )
  const matchId = repository.matches[0].id
  return { repository, lockQueue, matchId, scheduledAt }
}

test('admin creates a match; it lands in the lobby and schedules the auto-lock', async () => {
  const { repository, lockQueue, matchId, scheduledAt } = await setupWithMatch()
  const matches = await new ListMatchesQuery(repository).execute()
  expect(matches).toHaveLength(1)
  expect(matches[0].status).toBe('open')
  expect(matches[0].participants).toHaveLength(2)
  // the automatic betting lock is scheduled for the match's scheduledAt
  expect(lockQueue.scheduled).toEqual([{ matchId, at: scheduledAt }])
})

test('a non-admin cannot create a match (NOT_ADMIN)', async () => {
  const repository = new MatchRepositoryInMemory()
  const create = new CreateMatch(repository).execute(
    {
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      categoryIsLeaf: true,
      scheduledAt: inOneHour(),
      participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
    },
    user,
  )
  await expect(create).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(create).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('creating a match on a non-leaf category is rejected (CATEGORY_NOT_LEAF)', async () => {
  const repository = new MatchRepositoryInMemory()
  const create = new CreateMatch(repository).execute(
    {
      title: 'Fabio vs Bruno',
      categoryId: 'cat-branch',
      categoryIsLeaf: false,
      scheduledAt: inOneHour(),
      participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
    },
    admin,
  )
  await expect(create).rejects.toMatchObject({ code: Errors.CATEGORY_NOT_LEAF })
})

test('admin edits title and schedule while open; reschedules the auto-lock', async () => {
  const { repository, lockQueue, matchId } = await setupWithMatch()
  const newDate = new Date(Date.now() + 2 * 60 * 60 * 1000)

  await new UpdateMatch(repository, lockQueue).execute(
    { matchId, title: 'Novo titulo', scheduledAt: newDate },
    admin,
  )

  const match = await new GetMatchQuery(repository).execute(matchId)
  expect(match.title).toBe('Novo titulo')
  expect(new Date(match.scheduledAt).getTime()).toBe(newDate.getTime())
  // a second scheduleLock (reschedule) was recorded for the new date
  expect(lockQueue.scheduled).toHaveLength(2)
  expect(lockQueue.scheduled[1]).toEqual({ matchId, at: newDate })
})

test('a non-admin cannot edit a match (NOT_ADMIN)', async () => {
  const { repository, matchId } = await setupWithMatch()
  const edit = new UpdateMatch(repository).execute({ matchId, title: 'x' }, user)
  await expect(edit).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(edit).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('editing a locked match fails (MATCH_NOT_OPEN)', async () => {
  const { repository, matchId } = await setupWithMatch()
  await new LockMatch(repository).execute({ matchId }, admin)
  const edit = new UpdateMatch(repository).execute({ matchId, title: 'x' }, admin)
  await expect(edit).rejects.toBeInstanceOf(ConflictError)
  await expect(edit).rejects.toMatchObject({ code: Errors.MATCH_NOT_OPEN })
})

test('editing to a past date fails (SCHEDULED_IN_PAST)', async () => {
  const { repository, matchId } = await setupWithMatch()
  const edit = new UpdateMatch(repository).execute(
    { matchId, scheduledAt: new Date(Date.now() - 1000) },
    admin,
  )
  await expect(edit).rejects.toBeInstanceOf(ValidationError)
  await expect(edit).rejects.toMatchObject({ code: Errors.SCHEDULED_IN_PAST })
})

test('the scheduled auto-lock closes betting (open -> locked)', async () => {
  const { repository, matchId } = await setupWithMatch()
  await new AutoLockMatch(repository).execute({ matchId })
  const match = await new GetMatchQuery(repository).execute(matchId)
  expect(match.status).toBe('locked')
})

test('auto-lock is a no-op when the match is not open (idempotent)', async () => {
  const { repository, matchId } = await setupWithMatch()
  await new LockMatch(repository).execute({ matchId }, admin) // admin locked early
  await new AutoLockMatch(repository).execute({ matchId }) // scheduled job fires later
  const match = await new GetMatchQuery(repository).execute(matchId)
  expect(match.status).toBe('locked')
})

test('auto-lock on an unknown match does not throw', async () => {
  const { repository } = await setupWithMatch()
  await expect(new AutoLockMatch(repository).execute({ matchId: 'ghost' })).resolves.toBeUndefined()
})

test('admin locks, declares the winner; the flow reaches settled', async () => {
  const { repository, matchId } = await setupWithMatch()
  const winner = repository.participants[0].id

  await new LockMatch(repository).execute({ matchId }, admin)
  await new DeclareMatchResult(repository).execute({ matchId, winnerParticipantId: winner }, admin)

  const match = await new GetMatchQuery(repository).execute(matchId)
  expect(match.status).toBe('settled')
  expect(match.winnerParticipantId).toBe(winner)
})

test('a non-admin cannot lock a match (NOT_ADMIN)', async () => {
  const { repository, matchId } = await setupWithMatch()
  await expect(new LockMatch(repository).execute({ matchId }, user)).rejects.toBeInstanceOf(
    AccessDeniedError,
  )
  await expect(new LockMatch(repository).execute({ matchId }, user)).rejects.toMatchObject({
    code: Errors.NOT_ADMIN,
  })
})

test('declaring a result before locking fails (INVALID_MATCH_STATUS)', async () => {
  const { repository, matchId } = await setupWithMatch()
  const winner = repository.participants[0].id
  await expect(
    new DeclareMatchResult(repository).execute({ matchId, winnerParticipantId: winner }, admin),
  ).rejects.toBeInstanceOf(ConflictError)
})

test('admin can cancel an open match', async () => {
  const { repository, matchId } = await setupWithMatch()
  await new CancelMatch(repository).execute({ matchId }, admin)
  const match = await new GetMatchQuery(repository).execute(matchId)
  expect(match.status).toBe('cancelled')
})
