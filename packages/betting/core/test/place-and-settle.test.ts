import { Errors, ConflictError, ValidationError } from 'shared'
import { PlaceBet, SettleMatch, RefundMatch, ListBetsByMatchQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

const OPEN = { matchStatus: 'open', participantIds: ['A', 'B'] }

async function placeSome(repository: BettingRepositoryInMemory) {
  const place = new PlaceBet(repository)
  await place.execute({ matchId: 'm1', bettorId: 'u1', participantId: 'A', stake: 1000, ...OPEN })
  await place.execute({ matchId: 'm1', bettorId: 'u2', participantId: 'A', stake: 1000, ...OPEN })
  await place.execute({ matchId: 'm1', bettorId: 'u3', participantId: 'B', stake: 1000, ...OPEN })
}

test('places a bet on an open match', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceBet(repository).execute({
    matchId: 'm1',
    bettorId: 'u1',
    participantId: 'A',
    stake: 1000,
    ...OPEN,
  })
  expect(repository.bets).toHaveLength(1)
})

test('cannot bet on a non-open match (BETTING_CLOSED)', async () => {
  const repository = new BettingRepositoryInMemory()
  await expect(
    new PlaceBet(repository).execute({
      matchId: 'm1',
      bettorId: 'u1',
      participantId: 'A',
      stake: 1000,
      matchStatus: 'locked',
      participantIds: ['A', 'B'],
    }),
  ).rejects.toBeInstanceOf(ConflictError)
})

test('cannot bet on a non-participant (NOT_A_PARTICIPANT)', async () => {
  const repository = new BettingRepositoryInMemory()
  await expect(
    new PlaceBet(repository).execute({
      matchId: 'm1',
      bettorId: 'u1',
      participantId: 'Z',
      stake: 1000,
      ...OPEN,
    }),
  ).rejects.toMatchObject({ code: Errors.NOT_A_PARTICIPANT })
})

test('settlement resolves winners and losers by the parimutuel share', async () => {
  const repository = new BettingRepositoryInMemory()
  await placeSome(repository)

  await new SettleMatch(repository).execute({ matchId: 'm1', winnerParticipantId: 'B', rakeBasisPoints: 0 })

  const book = await new ListBetsByMatchQuery(repository).execute('m1')
  const onB = book.find((bet) => bet.participantId === 'B')!
  const onA = book.filter((bet) => bet.participantId === 'A')
  expect(onB.status).toBe('won')
  // single B backer takes the whole distributable pool of 3000
  expect(onB.payout).toBe(3000)
  expect(onA.every((bet) => bet.status === 'lost')).toBe(true)
})

test('refund settles every open bet back to its stake', async () => {
  const repository = new BettingRepositoryInMemory()
  await placeSome(repository)

  await new RefundMatch(repository).execute({ matchId: 'm1' })

  const book = await new ListBetsByMatchQuery(repository).execute('m1')
  expect(book.every((bet) => bet.status === 'refunded')).toBe(true)
  expect(book.every((bet) => bet.payout === 1000)).toBe(true)
})
