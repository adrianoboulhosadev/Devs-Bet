import { Money, ValidationError, Errors } from '../../src'

test('creates money from cents and exposes reais', () => {
  const money = new Money(1550)
  expect(money.cents).toBe(1550)
  expect(money.reais).toBe(15.5)
})

test('fromReais converts to cents, rounding to the nearest cent', () => {
  expect(Money.fromReais(15.5).cents).toBe(1550)
  expect(Money.fromReais(0.1).cents).toBe(10)
  expect(Money.fromReais(19.999).cents).toBe(2000)
})

test('zero builds an empty amount', () => {
  expect(Money.zero().isZero()).toBe(true)
})

test('rejects negative, fractional and non-finite amounts', () => {
  expect(() => new Money(-1)).toThrow(ValidationError)
  expect(() => new Money(10.5)).toThrow(ValidationError)
  expect(() => new Money(Number.NaN)).toThrow(ValidationError)
  expect(() => new Money(Number.POSITIVE_INFINITY)).toThrow(ValidationError)
})

test('the rejection carries the INVALID_AMOUNT code', () => {
  try {
    new Money(-5)
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.INVALID_AMOUNT)
  }
})

test('add and subtract return new immutable Money', () => {
  const ten = new Money(1000)
  const three = new Money(300)
  expect(ten.add(three).cents).toBe(1300)
  expect(ten.subtract(three).cents).toBe(700)
  expect(ten.cents).toBe(1000)
})

test('a subtraction that would go below zero throws (invariant guard)', () => {
  expect(() => new Money(300).subtract(new Money(500))).toThrow(ValidationError)
})

test('multiply rounds to the nearest cent (used by the payout share)', () => {
  expect(new Money(1000).multiply(0.3333).cents).toBe(333)
})

test('comparisons', () => {
  const five = new Money(500)
  const ten = new Money(1000)
  expect(ten.isGreaterThan(five)).toBe(true)
  expect(five.isLessThan(ten)).toBe(true)
  expect(ten.isGreaterThanOrEqual(new Money(1000))).toBe(true)
  expect(ten.equals(new Money(1000))).toBe(true)
  expect(ten.equals(five)).toBe(false)
  expect(ten.equals(undefined)).toBe(false)
})
