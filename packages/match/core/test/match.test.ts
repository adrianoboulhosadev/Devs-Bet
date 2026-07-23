import { Errors, ValidationError, ConflictError } from 'shared'
import { Match } from '../src'

function newMatch() {
  return new Match({
    creatorId: 'creator-1',
    title: 'Fabio vs Bruno',
    participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
  })
}

test('a new match starts open with its participants', () => {
  const match = newMatch()
  expect(match.status).toBe('open')
  expect(match.participants).toHaveLength(2)
})

test('requires a title', () => {
  expect(
    () => new Match({ creatorId: 'c', title: '  ', participants: [{ displayName: 'A' }, { displayName: 'B' }] }),
  ).toThrow(ValidationError)
})

test('requires at least two participants', () => {
  try {
    new Match({ creatorId: 'c', title: 'Solo', participants: [{ displayName: 'A' }] })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.NOT_ENOUGH_PARTICIPANTS)
  }
})

test('lockBetting moves open -> locked', () => {
  const match = newMatch()
  match.lockBetting()
  expect(match.status).toBe('locked')
  expect(match.lockedAt).toBeInstanceOf(Date)
})

test('locking a non-open match raises MATCH_NOT_OPEN', () => {
  const match = newMatch()
  match.lockBetting()
  try {
    match.lockBetting()
    fail('should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).code).toBe(Errors.MATCH_NOT_OPEN)
  }
})

test('settle declares the winner from locked', () => {
  const match = newMatch()
  const winner = match.participants[0].id.value
  match.lockBetting()
  match.settle(winner)
  expect(match.status).toBe('settled')
  expect(match.winnerParticipantId).toBe(winner)
})

test('cannot settle before locking (INVALID_MATCH_STATUS)', () => {
  const match = newMatch()
  try {
    match.settle(match.participants[0].id.value)
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.INVALID_MATCH_STATUS)
  }
})

test('the winner must be a participant (NOT_A_PARTICIPANT)', () => {
  const match = newMatch()
  match.lockBetting()
  try {
    match.settle('not-a-participant')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.NOT_A_PARTICIPANT)
  }
})

test('cannot settle twice (MATCH_ALREADY_SETTLED)', () => {
  const match = newMatch()
  const winner = match.participants[0].id.value
  match.lockBetting()
  match.settle(winner)
  try {
    match.settle(winner)
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.MATCH_ALREADY_SETTLED)
  }
})

test('cancel from open marks cancelled; cancelling a settled match fails', () => {
  const open = newMatch()
  open.cancel()
  expect(open.status).toBe('cancelled')

  const settled = newMatch()
  settled.lockBetting()
  settled.settle(settled.participants[0].id.value)
  expect(() => settled.cancel()).toThrow(ConflictError)
})
