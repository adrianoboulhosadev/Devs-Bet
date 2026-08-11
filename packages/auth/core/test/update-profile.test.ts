import { Errors, Id } from 'shared'
import { RegisterUser, UpdateProfile } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory } from './in-memory'

async function setupWithUser() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  const updateProfile = new UpdateProfile(repository)
  return { repository, updateProfile, userId: user!.id.value }
}

test('sets nickname and avatarUrl', async () => {
  const { repository, updateProfile, userId } = await setupWithUser()

  await updateProfile.execute({ userId, nickname: 'Zé Turbo', avatarUrl: '/uploads/avatars/a.png' })

  const user = await repository.findById(userId)
  expect(user!.nickname).toBe('Zé Turbo')
  expect(user!.avatarUrl).toBe('/uploads/avatars/a.png')
})

test('trims the nickname and stores an empty one as null', async () => {
  const { repository, updateProfile, userId } = await setupWithUser()

  await updateProfile.execute({ userId, nickname: '  Zé Turbo  ' })
  expect((await repository.findById(userId))!.nickname).toBe('Zé Turbo')

  await updateProfile.execute({ userId, nickname: '   ' })
  expect((await repository.findById(userId))!.nickname).toBeNull()
})

test('omitting a field leaves it unchanged', async () => {
  const { repository, updateProfile, userId } = await setupWithUser()

  await updateProfile.execute({ userId, nickname: 'Zé Turbo' })
  await updateProfile.execute({ userId, avatarUrl: '/uploads/avatars/a.png' })

  const user = await repository.findById(userId)
  expect(user!.nickname).toBe('Zé Turbo')
  expect(user!.avatarUrl).toBe('/uploads/avatars/a.png')
})

test('rejects when the user does not exist', async () => {
  const { updateProfile } = await setupWithUser()
  await expect(
    updateProfile.execute({ userId: Id.create(), nickname: 'Zé Turbo' }),
  ).rejects.toMatchObject({ code: Errors.USER_NOT_FOUND })
})
