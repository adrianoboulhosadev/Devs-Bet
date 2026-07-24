import { Errors, ValidationError, ConflictError } from 'shared'
import { Match } from '../src'

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

function newMatch() {
  return new Match({
    creatorId: 'creator-1',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    participants: [{ displayName: 'Fabio' }, { displayName: 'Bruno' }],
  })
}

test('a new match starts open with its participants', () => {
  const match = newMatch()
  expect(match.status).toBe('open')
  expect(match.participants).toHaveLength(2)
})

test('imageUrl is optional (defaults to null) and kept when provided', () => {
  expect(newMatch().imageUrl).toBeNull()
  const withImage = new Match({
    creatorId: 'c',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    imageUrl: '/uploads/matchs/x.png',
    participants: [{ displayName: 'A' }, { displayName: 'B' }],
  })
  expect(withImage.imageUrl).toBe('/uploads/matchs/x.png')
})

test('requires a categoryId', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      scheduledAt: inOneHour(),
      participants: [{ displayName: 'A' }, { displayName: 'B' }],
    } as never)
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.REQUIRED_FIELD)
  }
})

test('requires a title', () => {
  expect(
    () =>
      new Match({
        creatorId: 'c',
        title: '  ',
        scheduledAt: inOneHour(),
        participants: [{ displayName: 'A' }, { displayName: 'B' }],
      }),
  ).toThrow(ValidationError)
})

test('requires a scheduledAt', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      participants: [{ displayName: 'A' }, { displayName: 'B' }],
    } as never)
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.REQUIRED_FIELD)
  }
})

test('a new match cannot be scheduled in the past (SCHEDULED_IN_PAST)', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      scheduledAt: new Date(Date.now() - 1000),
      participants: [{ displayName: 'A' }, { displayName: 'B' }],
    })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.SCHEDULED_IN_PAST)
  }
})

test('a past-dated match still reconstitutes when it carries an id', () => {
  // Reconstitution from the DB (has id) must not re-run the not-in-past rule.
  const existingId = '11111111-1111-4111-8111-111111111111'
  const match = new Match({
    id: existingId,
    creatorId: 'c',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: new Date(Date.now() - 1000),
    participants: [{ displayName: 'A' }, { displayName: 'B' }],
  })
  expect(match.id.value).toBe(existingId)
})

test('requires at least two participants', () => {
  try {
    new Match({ creatorId: 'c', title: 'Solo', categoryId: 'cat-leaf', scheduledAt: inOneHour(), participants: [{ displayName: 'A' }] })
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
