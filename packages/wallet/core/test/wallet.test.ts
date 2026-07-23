import { Money, Errors, ValidationError } from 'shared'
import { Wallet } from '../src'

function wallet(balance = 0, held = 0): Wallet {
  return new Wallet({ userId: 'user-1', balance, held })
}

test('available is balance minus held', () => {
  expect(wallet(10000, 3000).available.cents).toBe(7000)
})

test('deposit increases the balance', () => {
  const account = wallet(1000)
  account.deposit(new Money(500))
  expect(account.balance.cents).toBe(1500)
})

test('hold reserves funds and reduces available', () => {
  const account = wallet(10000)
  account.hold(new Money(4000))
  expect(account.held.cents).toBe(4000)
  expect(account.available.cents).toBe(6000)
})

test('hold beyond available raises INSUFFICIENT_BALANCE', () => {
  const account = wallet(3000)
  try {
    account.hold(new Money(3001))
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).code).toBe(Errors.INSUFFICIENT_BALANCE)
  }
})

test('release frees a hold without touching the balance', () => {
  const account = wallet(10000, 4000)
  account.release(new Money(4000))
  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(10000)
})

test('settleHold turns a hold into an outflow (balance and held down)', () => {
  const account = wallet(10000, 4000)
  account.settleHold(new Money(4000))
  expect(account.held.cents).toBe(0)
  expect(account.balance.cents).toBe(6000)
})

test('credit adds winnings to the balance', () => {
  const account = wallet(10000, 4000)
  account.credit(new Money(2500))
  expect(account.balance.cents).toBe(12500)
})

test('cannot be constructed with held greater than balance', () => {
  expect(() => wallet(1000, 2000)).toThrow(ValidationError)
})
