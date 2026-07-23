import { AuthenticatedActor, AccessDeniedError, Errors, ConflictError } from 'shared'
import {
  CreateMatch,
  LockMatch,
  DeclareMatchResult,
  CancelMatch,
  GetMatchQuery,
  ListMatchesQuery,
} from '../src'
import { MatchRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }

async function setupWithMatch() {
  const repository = new MatchRepositoryInMemory()
  await new CreateMatch(repository).execute(
    {
      title: 'Fabio vs Bruno',
      participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
    },
    admin,
  )
  const matchId = repository.matches[0].id
  return { repository, matchId }
}

test('admin creates a match; it lands in the lobby', async () => {
  const { repository } = await setupWithMatch()
  const matches = await new ListMatchesQuery(repository).execute()
  expect(matches).toHaveLength(1)
  expect(matches[0].status).toBe('open')
  expect(matches[0].participants).toHaveLength(2)
})

test('a non-admin cannot create a match (NOT_ADMIN)', async () => {
  const repository = new MatchRepositoryInMemory()
  const create = new CreateMatch(repository).execute(
    {
      title: 'Fabio vs Bruno',
      participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
    },
    user,
  )
  await expect(create).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(create).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
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
