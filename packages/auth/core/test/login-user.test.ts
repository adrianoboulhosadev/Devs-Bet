import { Errors } from 'shared'
import { RegisterUser, LoginUser } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

async function setupWithUser() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory('secret')
  const sessionRepository = new AuthSessionRepositoryInMemory()

  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })

  const login = new LoginUser(repository, hash, jwt, sessionRepository)
  return { repository, sessionRepository, login }
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

test('updates lastLoginAt on successful login', async () => {
  const { repository, login } = await setupWithUser()
  await login.execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  // lastLoginAt is infra: not on the entity, only on the read DTO.
  const dto = await repository.findByIdQuery(user!.id.value)
  expect(dto!.lastLoginAt).toBeInstanceOf(Date)
})
