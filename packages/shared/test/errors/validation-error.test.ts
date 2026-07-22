import { ValidationError, Errors } from '../../src'

test('throwError throws a ValidationError with the given code', () => {
  expect(() => ValidationError.throwError('ERROR', 'value')).toThrow('ERROR')
})

test('creates an error with code, value and extras', () => {
  const error = new ValidationError({ code: 'WEAK_PASSWORD', value: '123', extras: { min: 8 } })
  expect(error.code).toBe('WEAK_PASSWORD')
  expect(error.value).toBe('123')
  expect(error.extras).toEqual({ min: 8 })
})

test('create builds an error with the same fields', () => {
  const error = ValidationError.create('INVALID_EMAIL', 'x@', { hint: 'use @' })
  expect(error.code).toBe('INVALID_EMAIL')
  expect(error.value).toBe('x@')
  expect(error.extras).toEqual({ hint: 'use @' })
})

test('without a code it uses UNKNOWN_ERROR', () => {
  expect(new ValidationError().code).toBe(Errors.UNKNOWN_ERROR)
  expect(ValidationError.create().code).toBe(Errors.UNKNOWN_ERROR)
})

test('is an instance of Error', () => {
  expect(ValidationError.create('X')).toBeInstanceOf(Error)
})
