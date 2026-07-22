import { Errors } from 'shared'
import { Email } from '../src'

test('normalizes (trim + lowercase) a valid email', () => {
  const email = new Email('  Adriano@Email.com.BR ')
  expect(email.value).toBe('adriano@email.com.br')
})

test('exposes user and domain parts', () => {
  const email = new Email('adriano@email.com.br')
  expect(email.user).toBe('adriano')
  expect(email.domain).toBe('email.com.br')
})

test('rejects an invalid email with INVALID_EMAIL', () => {
  try {
    new Email('not-an-email')
    fail('should have thrown')
  } catch (error) {
    expect((error as { code: string }).code).toBe(Errors.INVALID_EMAIL)
  }
})

test('rejects an empty email', () => {
  expect(() => new Email()).toThrow()
  expect(() => new Email('')).toThrow()
})
