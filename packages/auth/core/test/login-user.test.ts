import { Errors } from 'shared'
import { RegisterUser, LoginUser } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

/** A sign-up starts PENDING (closed platform), so every login test that expects
 * to get in has to release the account first — same as an admin approving. */
async function setupWithUser(approve = true) {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory('secret')
  const sessionRepository = new AuthSessionRepositoryInMemory()

  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  if (approve) await repository.updateApprovalStatus(user!.id.value, 'approved')

  const login = new LoginUser(repository, hash, jwt, sessionRepository)
  return { repository, sessionRepository, login, userId: user!.id.value }
}

test('logs in, returns tokens and opens a refresh session', async () => {
  const { repository, sessionRepository, login } = await setupWithUser()
  const tokens = await login.execute({ email: 'A@b.com', password: 'Senha@123' })

  expect(tokens.accessToken.length).toBeGreaterThan(0)
  expect(tokens.refreshToken.length).toBeGreaterThan(0)

  const user = await repository.findByEmail('a@b.com')
  const sessions = await sessionRepository.findActiveByUser(user!.id.value)
  expect(sessions).toHaveLength(1)
})

test('wrong password and nonexistent email return the SAME generic error', async () => {
  const { login } = await setupWithUser()

  await expect(login.execute({ email: 'a@b.com', password: 'Wrong@123' })).rejects.toMatchObject({
    code: Errors.INVALID_EMAIL_OR_PASSWORD,
  })
  await expect(
    login.execute({ email: 'doesnotexist@b.com', password: 'Senha@123' }),
  ).rejects.toMatchObject({ code: Errors.INVALID_EMAIL_OR_PASSWORD })
})

test('a pending account is told it is waiting for approval', async () => {
  const { login } = await setupWithUser(false)

  await expect(login.execute({ email: 'a@b.com', password: 'Senha@123' })).rejects.toMatchObject({
    code: Errors.ACCOUNT_PENDING_APPROVAL,
  })
})

test('a REJECTED account is indistinguishable from a wrong password', async () => {
  const { repository, login, userId } = await setupWithUser()
  await repository.updateApprovalStatus(userId, 'rejected')

  // Same code as a bad password on purpose: someone the admin barred must not be
  // able to tell that the account even exists.
  await expect(login.execute({ email: 'a@b.com', password: 'Senha@123' })).rejects.toMatchObject({
    code: Errors.INVALID_EMAIL_OR_PASSWORD,
  })
})

test('a rejected account opens no session', async () => {
  const { repository, sessionRepository, login, userId } = await setupWithUser()
  await repository.updateApprovalStatus(userId, 'rejected')

  await expect(login.execute({ email: 'a@b.com', password: 'Senha@123' })).rejects.toBeDefined()
  expect(await sessionRepository.findActiveByUser(userId)).toHaveLength(0)
})

test('updates lastLoginAt on successful login', async () => {
  const { repository, login } = await setupWithUser()
  await login.execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  // lastLoginAt is infra: not on the entity, only on the read DTO.
  const dto = await repository.findByIdQuery(user!.id.value)
  expect(dto!.lastLoginAt).toBeInstanceOf(Date)
})
