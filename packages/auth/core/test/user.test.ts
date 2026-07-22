import { Errors } from 'shared'
import { User } from '../src'

const validHash = '$2a$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY./'

test('builds a user with value objects and sensible defaults', () => {
  const user = new User({ email: 'a@b.com', password: validHash })
  expect(user.email.value).toBe('a@b.com')
  expect(user.password!.value).toBe(validHash)
  expect(user.role).toBe('user')
  expect(user.active).toBe(true)
  expect(user.isAdmin).toBe(false)
})

test('an admin user reports isAdmin', () => {
  expect(new User({ email: 'a@b.com', role: 'admin' }).isAdmin).toBe(true)
})

test('can be reconstituted without the password (read projection)', () => {
  const user = new User({ email: 'a@b.com' })
  expect(user.password).toBeUndefined()
})

test('withoutPassword drops the secret keeping the identity', () => {
  const user = new User({ email: 'a@b.com', password: validHash })
  const stripped = user.withoutPassword()
  expect(stripped.password).toBeUndefined()
  expect(stripped.id.value).toBe(user.id.value)
  expect(stripped.email.value).toBe('a@b.com')
})

test('deactivate flips the active flag', () => {
  const user = new User({ email: 'a@b.com' })
  user.deactivate()
  expect(user.active).toBe(false)
})

test('rejects an invalid email at construction', () => {
  try {
    new User({ email: 'bad' })
  } catch (error) {
    expect((error as { code: string }).code).toBe(Errors.INVALID_EMAIL)
  }
})

test('rejects a malformed password hash at construction', () => {
  try {
    new User({ email: 'a@b.com', password: 'not-a-hash' })
  } catch (error) {
    expect((error as { code: string }).code).toBe(Errors.INVALID_PASSWORD_HASH)
  }
})
