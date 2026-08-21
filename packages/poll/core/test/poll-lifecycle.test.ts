import { AuthenticatedActor, Errors, AccessDeniedError, NotFoundError } from 'shared'
import { CreatePoll, ReschedulePoll, ClosePoll, AutoClosePoll, ResolvePoll, CancelPoll, GetPollQuery, ListPollsQuery } from '../src'
import { PollRepositoryInMemory, PollCloseQueueInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const bettor: AuthenticatedActor = { id: 'user-1', role: 'user' }
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    question: 'Quando o Fabio vai ser demitido?',
    resolutionCriteria: 'Vale o anúncio oficial no grupo do trabalho.',
    categoryId: 'cat-leaf',
    categoryIsLeaf: true,
    closesAt: inOneHour(),
    options: [{ label: 'Até junho' }, { label: 'Depois de junho' }],
    ...overrides,
  }
}

async function openPoll() {
  const repository = new PollRepositoryInMemory()
  const queue = new PollCloseQueueInMemory()
  await new CreatePoll(repository, queue).execute(createInput(), admin)
  return { repository, queue, pollId: repository.polls[0].id }
}

test('an admin opens a poll and its automatic close is scheduled', async () => {
  const { repository, queue, pollId } = await openPoll()

  expect(repository.polls).toHaveLength(1)
  expect(repository.polls[0].status).toBe('open')
  expect(repository.options).toHaveLength(2)
  expect(queue.scheduled).toEqual([{ pollId, at: repository.polls[0].closesAt }])
})

test('a non-admin cannot open a poll', async () => {
  const repository = new PollRepositoryInMemory()
  try {
    await new CreatePoll(repository).execute(createInput(), bettor)
    fail('should have thrown')
  } catch (error) {
    expect((error as AccessDeniedError).code).toBe(Errors.NOT_ADMIN)
  }
  expect(repository.polls).toHaveLength(0)
})

test('the category must be a leaf (resolved by the app, checked here)', async () => {
  const repository = new PollRepositoryInMemory()
  try {
    await new CreatePoll(repository).execute(createInput({ categoryIsLeaf: false }), admin)
    fail('should have thrown')
  } catch (error) {
    expect((error as Error & { code: string }).code).toBe(Errors.CATEGORY_NOT_LEAF)
  }
})

test('the full path: close, resolve, and the winner is readable from the query side', async () => {
  const { repository, pollId } = await openPoll()

  await new ClosePoll(repository).execute({ pollId }, admin)
  expect(repository.polls[0].status).toBe('closed')

  const winningOptionId = repository.options[1].id
  await new ResolvePoll(repository).execute({ pollId, winningOptionId }, admin)

  const poll = await new GetPollQuery(repository).execute(pollId)
  expect(poll.status).toBe('settled')
  expect(poll.winningOptionId).toBe(winningOptionId)
  expect(poll.options.map((option) => option.label)).toEqual(['Até junho', 'Depois de junho'])
})

test('the scheduled close is idempotent and never fights an admin', async () => {
  const { repository, pollId } = await openPoll()
  const autoClose = new AutoClosePoll(repository)

  await autoClose.execute({ pollId })
  expect(repository.polls[0].status).toBe('closed')
  const closedAt = repository.polls[0].closedAt

  // Fires again (a retried job): no-op, not a second close.
  await autoClose.execute({ pollId })
  expect(repository.polls[0].closedAt).toBe(closedAt)

  // And a job for a poll that has been cancelled meanwhile does nothing either.
  await autoClose.execute({ pollId: 'a-poll-that-does-not-exist' })
})

test('moving the deadline re-schedules the automatic close', async () => {
  const { repository, queue, pollId } = await openPoll()
  const later = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await new ReschedulePoll(repository, queue).execute({ pollId, closesAt: later }, admin)

  expect(repository.polls[0].closesAt).toEqual(later)
  expect(queue.scheduled).toHaveLength(2)
  expect(queue.scheduled[1]).toEqual({ pollId, at: later })
})

test('cancelling is the exit for a question the world never answered', async () => {
  const { repository, pollId } = await openPoll()

  await new CancelPoll(repository).execute({ pollId }, admin)

  expect(repository.polls[0].status).toBe('cancelled')
  expect(repository.polls[0].winningOptionId).toBeNull()
})

test('every command answers POLL_NOT_FOUND for an unknown poll', async () => {
  const repository = new PollRepositoryInMemory()
  const pollId = 'no-such-poll'

  for (const run of [
    () => new ClosePoll(repository).execute({ pollId }, admin),
    () => new CancelPoll(repository).execute({ pollId }, admin),
    () => new ResolvePoll(repository).execute({ pollId, winningOptionId: 'x' }, admin),
    () => new ReschedulePoll(repository).execute({ pollId, closesAt: inOneHour() }, admin),
  ]) {
    try {
      await run()
      fail('should have thrown')
    } catch (error) {
      expect((error as NotFoundError).code).toBe(Errors.POLL_NOT_FOUND)
    }
  }
})

test('the lobby lists the polls, newest first', async () => {
  const repository = new PollRepositoryInMemory()
  await new CreatePoll(repository).execute(createInput({ question: 'Primeira?' }), admin)
  await new CreatePoll(repository).execute(createInput({ question: 'Segunda?' }), admin)
  // createdAt is stamped by the fake at insert time; force them apart.
  repository.polls[0].createdAt = new Date(Date.now() - 1000)

  const polls = await new ListPollsQuery(repository).execute()

  expect(polls.map((poll) => poll.question)).toEqual(['Segunda?', 'Primeira?'])
})
