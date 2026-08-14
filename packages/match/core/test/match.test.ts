import { Errors, ValidationError, ConflictError } from 'shared'
import { Match } from '../src'

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

function newMatch() {
  return new Match({
    creatorId: 'creator-1',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    participants: [{ displayName: 'Fabio', participantId: 'p-Fabio' }, { displayName: 'Bruno', participantId: 'p-Bruno' }],
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
    participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
  })
  expect(withImage.imageUrl).toBe('/uploads/matchs/x.png')
})

test('requires a categoryId', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      scheduledAt: inOneHour(),
      participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
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
        participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
      }),
  ).toThrow(ValidationError)
})

test('requires a scheduledAt', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
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
      participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
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
    participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
  })
  expect(match.id.value).toBe(existingId)
})

test('requires at least two participants', () => {
  try {
    new Match({ creatorId: 'c', title: 'Solo', categoryId: 'cat-leaf', scheduledAt: inOneHour(), participants: [{ displayName: 'A', participantId: 'p-A' }] })
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

test('recordUnitResult(1, winner) settles a bestOf-1 match outright', () => {
  const match = newMatch()
  const winner = match.participants[0].id.value
  match.lockBetting()
  match.recordUnitResult(1, winner, 'proof.jpg')
  expect(match.status).toBe('settled')
  expect(match.winnerParticipantId).toBe(winner)
  expect(match.units).toHaveLength(1)
})

test('recording a unit result without a proof photo raises RESULT_PROOF_REQUIRED', () => {
  const match = newMatch()
  const winner = match.participants[0].id.value
  match.lockBetting()
  try {
    match.recordUnitResult(1, winner, '')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.RESULT_PROOF_REQUIRED)
  }
})

test('cannot record a result before locking (INVALID_MATCH_STATUS)', () => {
  const match = newMatch()
  try {
    match.recordUnitResult(1, match.participants[0].id.value, 'proof.jpg')
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.INVALID_MATCH_STATUS)
  }
})

test('the winner must be a participant (NOT_A_PARTICIPANT)', () => {
  const match = newMatch()
  match.lockBetting()
  try {
    match.recordUnitResult(1, 'not-a-participant', 'proof.jpg')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.NOT_A_PARTICIPANT)
  }
})

test('recordUnitResult(1, null) declares a draw (allowsDraw defaults to true)', () => {
  const match = newMatch()
  expect(match.allowsDraw).toBe(true)
  match.lockBetting()
  match.recordUnitResult(1, null, 'proof.jpg')
  expect(match.status).toBe('settled')
  expect(match.winnerParticipantId).toBeNull()
})

test('a draw is rejected when the match does not allow one (DRAW_NOT_ALLOWED)', () => {
  const match = new Match({
    creatorId: 'creator-1',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    allowsDraw: false,
    participants: [{ displayName: 'Fabio', participantId: 'p-Fabio' }, { displayName: 'Bruno', participantId: 'p-Bruno' }],
  })
  match.lockBetting()
  try {
    match.recordUnitResult(1, null, 'proof.jpg')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.DRAW_NOT_ALLOWED)
  }
})

test('cannot record a result once the match is already settled (MATCH_ALREADY_SETTLED)', () => {
  const match = newMatch()
  const winner = match.participants[0].id.value
  match.lockBetting()
  match.recordUnitResult(1, winner, 'proof.jpg')
  try {
    match.recordUnitResult(2, winner, 'proof.jpg')
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
  settled.recordUnitResult(1, settled.participants[0].id.value, 'proof.jpg')
  expect(() => settled.cancel()).toThrow(ConflictError)
})

test('rejects an invalid bestOf (INVALID_BEST_OF)', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      scheduledAt: inOneHour(),
      bestOf: 2,
      participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
    })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.INVALID_BEST_OF)
  }
})

test('a multi-unit match cannot allow a draw (DRAW_NOT_ALLOWED)', () => {
  try {
    new Match({
      creatorId: 'c',
      title: 'Fabio vs Bruno',
      categoryId: 'cat-leaf',
      scheduledAt: inOneHour(),
      bestOf: 3,
      allowsDraw: true,
      participants: [{ displayName: 'A', participantId: 'p-A' }, { displayName: 'B', participantId: 'p-B' }],
    })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.DRAW_NOT_ALLOWED)
  }
})

test('a bestOf-3 match settles once a participant reaches the majority (2 units)', () => {
  const match = new Match({
    creatorId: 'c',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    bestOf: 3,
    allowsDraw: false,
    participants: [{ displayName: 'Fabio', participantId: 'p-Fabio' }, { displayName: 'Bruno', participantId: 'p-Bruno' }],
  })
  const [fabio, bruno] = match.participants.map((participant) => participant.id.value)
  match.lockBetting()

  match.recordUnitResult(1, fabio, 'proof.jpg')
  expect(match.status).toBe('locked')

  match.recordUnitResult(2, bruno, 'proof.jpg')
  expect(match.status).toBe('locked')

  match.recordUnitResult(3, fabio, 'proof.jpg')
  expect(match.status).toBe('settled')
  expect(match.winnerParticipantId).toBe(fabio)
  expect(match.units).toHaveLength(3)
})

test('unit results must be recorded in order (INVALID_UNIT_NUMBER)', () => {
  const match = new Match({
    creatorId: 'c',
    title: 'Fabio vs Bruno',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    bestOf: 3,
    allowsDraw: false,
    participants: [{ displayName: 'Fabio', participantId: 'p-Fabio' }, { displayName: 'Bruno', participantId: 'p-Bruno' }],
  })
  match.lockBetting()
  try {
    match.recordUnitResult(2, match.participants[0].id.value, 'proof.jpg')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.INVALID_UNIT_NUMBER)
  }
})
