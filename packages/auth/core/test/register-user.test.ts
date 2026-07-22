import { Errors } from 'shared'
import { RegisterUser } from '../src'
import { UserRepositoryInMemory, HashProviderInMemory } from './in-memory'

function setup() {
  const repository = new UserRepositoryInMemory()
  const hash = new HashProviderInMemory()
  const useCase = new RegisterUser(repository, hash)
  return { repository, hash, useCase }
}

test('registers user, normalizes email and stores the password as hash (never plaintext)', async () => {
  const { repository, useCase } = setup()

  await useCase.execute({ email: '  Adriano@Email.com.BR ', password: 'Senha@123' })

  const user = await repository.findByEmail('adriano@email.com.br')
  expect(user).not.toBeNull()
  expect(user!.id.value).toBeDefined()
  expect(user!.email.value).toBe('adriano@email.com.br')
  expect(user!.password!.value).not.toBe('Senha@123')
  expect(user!.password!.value).toMatch(/^\$2a\$/)
  expect(user!.role).toBe('user')
  expect(user!.active).toBe(true)
})

test('rejects invalid email with INVALID_EMAIL', async () => {
  const { useCase } = setup()
  await expect(useCase.execute({ email: 'not-an-email', password: 'Senha@123' })).rejects.toMatchObject(
    { code: Errors.INVALID_EMAIL },
  )
})

test('rejects a weak password with WEAK_PASSWORD', async () => {
  const { useCase } = setup()
  await expect(useCase.execute({ email: 'a@b.com', password: '123' })).rejects.toMatchObject({
    code: Errors.WEAK_PASSWORD,
  })
})

test('rejects already registered email', async () => {
  const { useCase } = setup()
  await useCase.execute({ email: 'a@b.com', password: 'Senha@123' })
  await expect(useCase.execute({ email: 'a@b.com', password: 'Outra@123' })).rejects.toMatchObject({
    code: Errors.USER_ALREADY_EXISTS,
  })
})
