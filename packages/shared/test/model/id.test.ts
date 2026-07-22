import { Id } from '../../src'

test('generates a valid id (uuid v4) with 36 characters', () => {
  const value = Id.create()
  expect(value).toHaveLength(36)
  expect(Id.isValid(value)).toBe(true)
})

test('creates an Id from an already existing value', () => {
  const value = Id.create()
  const id = new Id(value)
  expect(id.value).toBe(value)
})

test('generates a value when the constructor is called without an argument', () => {
  const id = new Id()
  expect(Id.isValid(id.value)).toBe(true)
})

test('throws an error when trying to create an invalid id', () => {
  expect(() => new Id('1234')).toThrow('Invalid id')
})

test('considers two different ids as not equal', () => {
  const id1 = new Id()
  const id2 = new Id()
  expect(id1.equals(id2)).toBe(false)
  expect(id1.notEquals(id2)).toBe(true)
})

test('considers two ids with the same value as equal', () => {
  const id1 = new Id()
  const id2 = new Id(id1.value)
  expect(id1.equals(id2)).toBe(true)
  expect(id1.notEquals(id2)).toBe(false)
})

test('is not equal to undefined', () => {
  const id = new Id()
  expect(id.equals(undefined)).toBe(false)
  expect(id.notEquals(undefined)).toBe(true)
})
