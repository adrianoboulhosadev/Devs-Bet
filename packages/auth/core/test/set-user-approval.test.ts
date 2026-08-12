import { Errors, Id, AuthenticatedActor } from 'shared'
import { RegisterUser, SetUserApproval, AuthSession, calculateRefreshExpiration } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

const admin: AuthenticatedActor = { id: Id.create(), role: 'admin' }
const plainUser: AuthenticatedActor = { id: Id.create(), role: 'user' }

async function setup() {
  const repository = new UserRepositoryInMemory()
  const sessionRepository = new AuthSessionRepositoryInMemory()
  const hash = new HashProviderInMemory()

  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')

  const setApproval = new SetUserApproval(repository, sessionRepository)
  return { repository, sessionRepository, setApproval, userId: user!.id.value }
}

test('a sign-up starts pending and the admin releases it', async () => {
  const { repository, setApproval, userId } = await setup()
  expect((await repository.findById(userId))!.approvalStatus).toBe('pending')

  await setApproval.execute({ userId, status: 'approved' }, admin)

  expect((await repository.findById(userId))!.isApproved).toBe(true)
})

test('rejecting bars the account AND tears down its open sessions', async () => {
  const { repository, sessionRepository, setApproval, userId } = await setup()
  await setApproval.execute({ userId, status: 'approved' }, admin)
  // Someone already in, with a live session (as if they had logged in).
  await sessionRepository.save(
    new AuthSession({ userId, verifierHash: 'hash', expiresAt: calculateRefreshExpiration() }),
  )

  await setApproval.execute({ userId, status: 'rejected' }, admin)

  expect((await repository.findById(userId))!.approvalStatus).toBe('rejected')
  expect(await sessionRepository.findActiveByUser(userId)).toHaveLength(0)
})

test('approving does not touch the sessions', async () => {
  const { sessionRepository, setApproval, userId } = await setup()
  await sessionRepository.save(
    new AuthSession({ userId, verifierHash: 'hash', expiresAt: calculateRefreshExpiration() }),
  )

  await setApproval.execute({ userId, status: 'approved' }, admin)

  expect(await sessionRepository.findActiveByUser(userId)).toHaveLength(1)
})

test('a rejected account can be approved later', async () => {
  const { repository, setApproval, userId } = await setup()
  await setApproval.execute({ userId, status: 'rejected' }, admin)

  await setApproval.execute({ userId, status: 'approved' }, admin)

  expect((await repository.findById(userId))!.isApproved).toBe(true)
})

test('a non-admin cannot decide anyone', async () => {
  const { setApproval, userId } = await setup()

  await expect(
    setApproval.execute({ userId, status: 'approved' }, plainUser),
  ).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('an admin cannot change their OWN status (would lock the platform)', async () => {
  const { setApproval } = await setup()

  await expect(
    setApproval.execute({ userId: admin.id, status: 'rejected' }, admin),
  ).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('rejects an unknown user', async () => {
  const { setApproval } = await setup()

  await expect(
    setApproval.execute({ userId: Id.create(), status: 'approved' }, admin),
  ).rejects.toMatchObject({ code: Errors.USER_NOT_FOUND })
})
