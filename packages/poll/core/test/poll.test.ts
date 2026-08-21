import { Errors, ValidationError, ConflictError } from 'shared'
import { Poll, PollQuestion, PollOptionLabel, ResolutionCriteria } from '../src'

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

// `as never` on the props keeps the overrides map loose enough to feed the
// constructor an INVALID poll on purpose (a missing criterion, one option, a
// past deadline) — which is most of what there is to assert here.
function buildPoll(overrides: Record<string, unknown> = {}) {
  return new Poll({
    creatorId: 'creator-1',
    question: 'Quando o Fabio vai ser demitido?',
    resolutionCriteria: 'Vale o anúncio oficial no grupo do trabalho.',
    categoryId: 'cat-leaf',
    closesAt: inOneHour(),
    options: [{ label: 'Até junho' }, { label: 'Depois de junho' }],
    ...overrides,
  } as never)
}

test('a new poll starts open with its options', () => {
  const poll = buildPoll()
  expect(poll.status).toBe('open')
  expect(poll.options).toHaveLength(2)
  expect(poll.winningOptionId).toBeNull()
})

test('question, criteria and options are trimmed value objects', () => {
  const poll = buildPoll({
    question: '  Fulano sai da empresa?  ',
    resolutionCriteria: '  Anúncio oficial.  ',
    options: [{ label: '  Sim  ' }, { label: 'Não' }],
  })
  expect(poll.question.value).toBe('Fulano sai da empresa?')
  expect(poll.resolutionCriteria.value).toBe('Anúncio oficial.')
  expect(poll.options[0].label.value).toBe('Sim')
})

test('requires a written resolution criterion — an unjudgeable poll is not a poll', () => {
  try {
    buildPoll({ resolutionCriteria: '   ' })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.REQUIRED_FIELD)
    expect((error as ValidationError).value).toBe('resolutionCriteria')
  }
})

test('requires a question and a category', () => {
  expect(() => buildPoll({ question: '  ' })).toThrow()
  expect(() => buildPoll({ categoryId: '' })).toThrow()
})

test('bounds the question, the criteria and each option label', () => {
  const tooLongQuestion = 'a'.repeat(PollQuestion.MAX_LENGTH + 1)
  const tooLongCriteria = 'a'.repeat(ResolutionCriteria.MAX_LENGTH + 1)
  const tooLongLabel = 'a'.repeat(PollOptionLabel.MAX_LENGTH + 1)

  expect(() => buildPoll({ question: tooLongQuestion })).toThrow()
  expect(() => buildPoll({ resolutionCriteria: tooLongCriteria })).toThrow()
  expect(() => buildPoll({ options: [{ label: tooLongLabel }, { label: 'Não' }] })).toThrow()
})

test('needs at least two options — one answer is not a question', () => {
  try {
    buildPoll({ options: [{ label: 'Sim' }] })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.NOT_ENOUGH_POLL_OPTIONS)
  }
})

test('caps the number of options', () => {
  const eleven = Array.from({ length: 11 }, (_, index) => ({ label: `Opção ${index}` }))
  try {
    buildPoll({ options: eleven })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.TOO_MANY_POLL_OPTIONS)
  }
})

test('rejects two options that read the same to a human', () => {
  try {
    buildPoll({ options: [{ label: 'Sim' }, { label: ' sim ' }] })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.DUPLICATE_POLL_OPTION)
  }
})

test('a brand-new poll cannot close in the past, but an old one still reconstitutes', () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  try {
    buildPoll({ closesAt: yesterday })
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.SCHEDULED_IN_PAST)
  }

  const reconstituted = buildPoll({ id: '11111111-1111-4111-8111-111111111111', closesAt: yesterday })
  expect(reconstituted.closesAt).toEqual(yesterday)
})

test('open → closed → settled is the happy path', () => {
  const poll = buildPoll()
  poll.closeBetting()
  expect(poll.status).toBe('closed')
  expect(poll.closedAt).toBeInstanceOf(Date)

  const winner = poll.options[1].id.value
  poll.resolve(winner)
  expect(poll.status).toBe('settled')
  expect(poll.winningOptionId).toBe(winner)
  expect(poll.settledAt).toBeInstanceOf(Date)
})

test('the result is never declared while betting is still open', () => {
  const poll = buildPoll()
  try {
    poll.resolve(poll.options[0].id.value)
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.INVALID_POLL_STATUS)
  }
})

test('the winning option must be one of this poll’s own', () => {
  const poll = buildPoll()
  poll.closeBetting()
  try {
    poll.resolve('an-option-of-another-poll')
    fail('should have thrown')
  } catch (error) {
    expect((error as ValidationError).code).toBe(Errors.INVALID_POLL_OPTION)
  }
})

test('betting only closes once', () => {
  const poll = buildPoll()
  poll.closeBetting()
  try {
    poll.closeBetting()
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.POLL_NOT_OPEN)
  }
})

test('a settled poll can be neither re-resolved nor cancelled', () => {
  const poll = buildPoll()
  poll.closeBetting()
  poll.resolve(poll.options[0].id.value)

  expect(() => poll.resolve(poll.options[1].id.value)).toThrow()
  try {
    poll.cancel()
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.POLL_ALREADY_SETTLED)
  }
})

test('a poll the world never answered can be cancelled even after closing', () => {
  const poll = buildPoll()
  poll.closeBetting()
  poll.cancel()
  expect(poll.status).toBe('cancelled')
})

test('the deadline moves only while the poll is open', () => {
  const poll = buildPoll()
  const later = new Date(Date.now() + 48 * 60 * 60 * 1000)
  poll.reschedule(later)
  expect(poll.closesAt).toEqual(later)

  poll.closeBetting()
  try {
    poll.reschedule(new Date(Date.now() + 72 * 60 * 60 * 1000))
    fail('should have thrown')
  } catch (error) {
    expect((error as ConflictError).code).toBe(Errors.POLL_NOT_OPEN)
  }
})

test('rescheduling into the past is refused', () => {
  const poll = buildPoll()
  expect(() => poll.reschedule(new Date(Date.now() - 1000))).toThrow()
})
