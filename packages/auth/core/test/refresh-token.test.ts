import { Errors } from 'shared'
import { RegisterUser, LoginUser, RefreshToken } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

async function setupLoggedIn() {
  const userRepository = new UserRepositoryInMemory()
  const sessionRepository = new AuthSessionRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory('secret')

  await new RegisterUser(userRepository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await userRepository.findByEmail('a@b.com')
  const { refreshToken } = await new LoginUser(userRepository, hash, jwt, sessionRepository).execute(
    { email: 'a@b.com', password: 'Senha@123' },
  )

  const refresh = new RefreshToken(jwt, sessionRepository, hash, userRepository)
  return { userRepository, sessionRepository, refresh, refreshToken, userId: user!.id.value }
}

test('rotates: valid refresh returns a new pair and the new one stays valid', async () => {
  const { refresh, refreshToken } = await setupLoggedIn()

  const tokens = await refresh.execute({ token: refreshToken }, 'secret')
  expect(tokens.accessToken.length).toBeGreaterThan(0)
  expect(tokens.refreshToken).not.toBe(refreshToken)

  const next = await refresh.execute({ token: tokens.refreshToken }, 'secret')
  expect(next.refreshToken).not.toBe(tokens.refreshToken)
})

test('detects reuse: replaying an already-rotated refresh tears down the family', async () => {
  const { refresh, refreshToken } = await setupLoggedIn()

  const tokens = await refresh.execute({ token: refreshToken }, 'secret')

  await expect(refresh.execute({ token: refreshToken }, 'secret')).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
  await expect(refresh.execute({ token: tokens.refreshToken }, 'secret')).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
})

test('rejects refresh with invalid signature', async () => {
  const { refresh, refreshToken } = await setupLoggedIn()
  await expect(refresh.execute({ token: refreshToken }, 'wrong-secret')).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
})

test('rejects when the session was revoked', async () => {
  const { refresh, refreshToken, sessionRepository, userId } = await setupLoggedIn()
  await sessionRepository.deleteAllByUser(userId)
  await expect(refresh.execute({ token: refreshToken }, 'secret')).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
})

test('rejects when the user was deactivated', async () => {
  const { refresh, refreshToken, userRepository, userId } = await setupLoggedIn()
  await userRepository.deactivate(userId)
  await expect(refresh.execute({ token: refreshToken }, 'secret')).rejects.toMatchObject({
    code: Errors.INVALID_SESSION,
  })
})
