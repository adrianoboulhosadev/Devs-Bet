import { RegisterUser, LoginUser, LogoutUser } from '../src'
import {
  UserRepositoryInMemory,
  HashProviderInMemory,
  JwtProviderInMemory,
  AuthSessionRepositoryInMemory,
} from './in-memory'

async function setup() {
  const userRepository = new UserRepositoryInMemory()
  const sessionRepository = new AuthSessionRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const jwt = new JwtProviderInMemory('secret')

  await new RegisterUser(userRepository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await userRepository.findByEmail('a@b.com')
  const login = new LoginUser(userRepository, hash, jwt, sessionRepository)
  const logout = new LogoutUser(sessionRepository, hash)
  return { sessionRepository, login, logout, userId: user!.id.value }
}

test('deletes only the session of the presented refresh, keeping the others', async () => {
  const { sessionRepository, login, logout, userId } = await setup()

  const first = await login.execute({ email: 'a@b.com', password: 'Senha@123' })
  await login.execute({ email: 'a@b.com', password: 'Senha@123' }) // second device

  expect(await sessionRepository.findActiveByUser(userId)).toHaveLength(2)

  await logout.execute({ userId, refreshToken: first.refreshToken })

  expect(await sessionRepository.findActiveByUser(userId)).toHaveLength(1)
})

test('is idempotent without a refresh token', async () => {
  const { logout, userId } = await setup()
  await expect(logout.execute({ userId })).resolves.toBeUndefined()
})
