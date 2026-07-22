import { Errors, Id } from 'shared'
import { RegisterUser, ChangePassword } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory } from './in-memory'

async function setupWithUser() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  await new RegisterUser(repository, hash).execute({ email: 'a@b.com', password: 'Senha@123' })
  const user = await repository.findByEmail('a@b.com')
  const changePassword = new ChangePassword(repository, hash)
  return { repository, hash, changePassword, userId: user!.id.value }
}

test('changes the password when the old one is correct and the new one is strong', async () => {
  const { repository, hash, changePassword, userId } = await setupWithUser()

  await changePassword.execute({ userId, oldPassword: 'Senha@123', newPassword: 'NovaSenha@456' })

  const user = await repository.findById(userId)
  expect(hash.compare('NovaSenha@456', user!.password!.value)).toBe(true)
})

test('rejects a wrong old password with INVALID_PASSWORD', async () => {
  const { changePassword, userId } = await setupWithUser()
  await expect(
    changePassword.execute({ userId, oldPassword: 'Wrong@123', newPassword: 'NovaSenha@456' }),
  ).rejects.toMatchObject({ code: Errors.INVALID_PASSWORD })
})

test('rejects a new password equal to the previous one', async () => {
  const { changePassword, userId } = await setupWithUser()
  await expect(
    changePassword.execute({ userId, oldPassword: 'Senha@123', newPassword: 'Senha@123' }),
  ).rejects.toMatchObject({ code: Errors.PASSWORD_SAME_AS_PREVIOUS })
})

test('rejects a weak new password with WEAK_PASSWORD', async () => {
  const { changePassword, userId } = await setupWithUser()
  await expect(
    changePassword.execute({ userId, oldPassword: 'Senha@123', newPassword: 'weak' }),
  ).rejects.toMatchObject({ code: Errors.WEAK_PASSWORD })
})

test('rejects when the user does not exist', async () => {
  const { changePassword } = await setupWithUser()
  await expect(
    changePassword.execute({ userId: Id.create(), oldPassword: 'Senha@123', newPassword: 'NovaSenha@456' }),
  ).rejects.toMatchObject({ code: Errors.USER_NOT_FOUND })
})
