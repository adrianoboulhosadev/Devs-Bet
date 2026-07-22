import { Validator } from '../../src'

test('notNull returns null for a non-null value', () => {
  expect(Validator.notNull('Good morning', 'NULL')).toBeNull()
})

test('notNull returns an error for null', () => {
  expect(Validator.notNull(null, 'NULL')!.code).toBe('NULL')
})

test('notEmpty returns null for filled text', () => {
  expect(Validator.notEmpty('Test', 'EMPTY')).toBeNull()
})

test('notEmpty returns an error for only spaces, null and undefined', () => {
  expect(Validator.notEmpty('   ', 'EMPTY')!.code).toBe('EMPTY')
  expect(Validator.notEmpty(null, 'EMPTY')!.code).toBe('EMPTY')
  expect(Validator.notEmpty(undefined, 'EMPTY')!.code).toBe('EMPTY')
})

test('minLength: null at the limit, error below', () => {
  expect(Validator.minLength('Test', 4, 'SMALL')).toBeNull()
  expect(Validator.minLength('Test', 8, 'SMALL')!.code).toBe('SMALL')
})

test('minLength stores the minimum in extras', () => {
  expect(Validator.minLength('ab', 8, 'SMALL')!.extras).toEqual({ min: 8 })
})

test('maxLength: null at the limit, error above', () => {
  expect(Validator.maxLength('Test', 4, 'BIG')).toBeNull()
  expect(Validator.maxLength('Test', 3, 'BIG')!.code).toBe('BIG')
})

test('matches validates the pattern', () => {
  expect(Validator.matches('12345678900', /\d{11}/, 'REGEX')).toBeNull()
  expect(Validator.matches('123a456789', /^\d{11}$/, 'REGEX')!.code).toBe('REGEX')
})

test('combineErrors returns only the non-null errors, in order', () => {
  const errors = Validator.combineErrors(
    Validator.notNull('Test', 'NULL_ERROR'),
    Validator.notEmpty(null, 'EMPTY_ERROR'),
    Validator.maxLength('Test', 3, 'BIG'),
  )
  expect(errors?.map((error) => error.code).join(', ')).toBe('EMPTY_ERROR, BIG')
})

test('combineErrors returns null when everything passes', () => {
  const errors = Validator.combineErrors(
    Validator.notNull('Test', 'NULL_ERROR'),
    Validator.notEmpty('Test', 'EMPTY_ERROR'),
  )
  expect(errors).toBeNull()
})
