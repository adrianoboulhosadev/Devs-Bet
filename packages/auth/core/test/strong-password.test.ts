import { Errors } from 'shared'
import { StrongPassword } from '../src'

test('accepts a password with uppercase, digit, special and 8+ chars', () => {
  expect(new StrongPassword('Senha@123').value).toBe('Senha@123')
})

test('rejects weak passwords with WEAK_PASSWORD', () => {
  const weak = ['short1!', 'nouppercase1!', 'NOLOWERCASE1!'.toLowerCase(), 'NoDigits!!', 'NoSpecial123']
  for (const password of weak) {
    try {
      new StrongPassword(password)
      fail(`should have rejected: ${password}`)
    } catch (error) {
      expect((error as { code: string }).code).toBe(Errors.WEAK_PASSWORD)
    }
  }
})

test('never leaks the raw password in the error value', () => {
  try {
    new StrongPassword('123')
  } catch (error) {
    expect((error as { value: unknown }).value).toBeUndefined()
  }
})
