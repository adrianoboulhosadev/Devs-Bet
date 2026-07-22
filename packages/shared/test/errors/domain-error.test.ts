import {
  DomainError,
  ValidationError,
  UnauthorizedError,
  AccessDeniedError,
  NotFoundError,
  ConflictError,
  Errors,
} from '../../src'

test('throwError throws the correct SUBCLASS, carrying the code', () => {
  let captured: unknown
  try {
    NotFoundError.throwError('USER_NOT_FOUND')
  } catch (error) {
    captured = error
  }
  expect(captured).toBeInstanceOf(NotFoundError)
  expect(captured).toBeInstanceOf(DomainError)
  expect(captured).toBeInstanceOf(Error)
  expect((captured as NotFoundError).code).toBe('USER_NOT_FOUND')
})

test('create returns the subclass, not the base', () => {
  expect(ConflictError.create('USER_ALREADY_EXISTS')).toBeInstanceOf(ConflictError)
  expect(UnauthorizedError.create('X')).toBeInstanceOf(UnauthorizedError)
  expect(AccessDeniedError.create('X')).toBeInstanceOf(AccessDeniedError)
  expect(ValidationError.create('X')).toBeInstanceOf(ValidationError)
})

test('the subclasses do not get confused with each other (essential for type-based mapping)', () => {
  expect(NotFoundError.create('X')).not.toBeInstanceOf(ConflictError)
  expect(ValidationError.create('X')).not.toBeInstanceOf(UnauthorizedError)
})

test('without a code it uses UNKNOWN_ERROR', () => {
  expect(ConflictError.create().code).toBe(Errors.UNKNOWN_ERROR)
})
