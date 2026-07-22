import { Errors, Id } from 'shared'
import { RegisterUser, DeactivateUser } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory } from './in-memory'

async function setupWithUser() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  const deactivate = new DeactivateUser(repository)
  return { repository, deactivate, userId: user!.id.value }
}

test('soft-deletes the user (active=false)', async () => {
  const { repository, deactivate, userId } = await setupWithUser()
  await deactivate.execute(userId)
  const dto = await repository.findByIdQuery(userId)
  expect(dto!.active).toBe(false)
})

test('rejects when the user does not exist', async () => {
  const { deactivate } = await setupWithUser()
  await expect(deactivate.execute(Id.create())).rejects.toMatchObject({
    code: Errors.USER_NOT_FOUND,
  })
})
