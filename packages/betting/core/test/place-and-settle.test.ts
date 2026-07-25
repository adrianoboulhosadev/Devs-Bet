import { ConflictError, Errors } from 'shared'
import { PlaceBet, SettleMarket, RefundMarket, ListBetsByMarketQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

const OPEN_MATCH = {
  marketType: 'match' as const,
  marketOpen: true,
  selectionIds: ['A', 'B'],
  bettorSelfExcluded: false,
}

async function placeSome(repository: BettingRepositoryInMemory) {
  const place = new PlaceBet(repository, repository)
  await place.execute({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 1000, ...OPEN_MATCH })
  await place.execute({ marketId: 'm1', bettorId: 'u2', selectionId: 'A', stake: 1000, ...OPEN_MATCH })
  await place.execute({ marketId: 'm1', bettorId: 'u3', selectionId: 'B', stake: 1000, ...OPEN_MATCH })
}

test('places a bet on an open market', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceBet(repository, repository).execute({
    marketId: 'm1',
    bettorId: 'u1',
    selectionId: 'A',
    stake: 1000,
    ...OPEN_MATCH,
  })
  expect(repository.bets).toHaveLength(1)
})

test('cannot bet on a closed market (BETTING_CLOSED)', async () => {
  const repository = new BettingRepositoryInMemory()
  await expect(
    new PlaceBet(repository, repository).execute({
      marketType: 'match',
      marketId: 'm1',
      bettorId: 'u1',
      selectionId: 'A',
      stake: 1000,
      marketOpen: false,
      selectionIds: ['A', 'B'],
      bettorSelfExcluded: false,
    }),
  ).rejects.toBeInstanceOf(ConflictError)
})

test('cannot bet on an invalid selection (NOT_A_PARTICIPANT)', async () => {
  const repository = new BettingRepositoryInMemory()
  await expect(
    new PlaceBet(repository, repository).execute({
      marketId: 'm1',
      bettorId: 'u1',
      selectionId: 'Z',
      stake: 1000,
      ...OPEN_MATCH,
    }),
  ).rejects.toMatchObject({ code: Errors.NOT_A_PARTICIPANT })
})

test('settlement resolves winners and losers by the parimutuel share', async () => {
  const repository = new BettingRepositoryInMemory()
  await placeSome(repository)

  await new SettleMarket(repository).execute({ marketId: 'm1', winningSelectionId: 'B', rakeBasisPoints: 0 })

  const book = await new ListBetsByMarketQuery(repository).execute('m1')
  const onB = book.find((bet) => bet.selectionId === 'B')!
  const onA = book.filter((bet) => bet.selectionId === 'A')
  expect(onB.status).toBe('won')
  // single B backer takes the whole distributable pool of 3000
  expect(onB.payout).toBe(3000)
  expect(onA.every((bet) => bet.status === 'lost')).toBe(true)
})

test('nobody backed the winner -> everyone loses (no refund)', async () => {
  const repository = new BettingRepositoryInMemory()
  const place = new PlaceBet(repository, repository)
  await place.execute({ marketId: 'm2', bettorId: 'u1', selectionId: 'A', stake: 1000, ...OPEN_MATCH })
  await place.execute({ marketId: 'm2', bettorId: 'u2', selectionId: 'A', stake: 1000, ...OPEN_MATCH })

  await new SettleMarket(repository).execute({ marketId: 'm2', winningSelectionId: 'B', rakeBasisPoints: 0 })

  const book = await new ListBetsByMarketQuery(repository).execute('m2')
  expect(book.every((bet) => bet.status === 'lost')).toBe(true)
  expect(book.every((bet) => bet.payout === 0)).toBe(true)
})

test('refund settles every open bet back to its stake', async () => {
  const repository = new BettingRepositoryInMemory()
  await placeSome(repository)

  await new RefundMarket(repository).execute({ marketId: 'm1' })

  const book = await new ListBetsByMarketQuery(repository).execute('m1')
  expect(book.every((bet) => bet.status === 'refunded')).toBe(true)
  expect(book.every((bet) => bet.payout === 1000)).toBe(true)
})

test('an outright (tournament champion) market settles like any other market', async () => {
  const repository = new BettingRepositoryInMemory()
  const place = new PlaceBet(repository, repository)
  const OPEN_OUTRIGHT = {
    marketType: 'tournament_outright' as const,
    marketOpen: true,
    selectionIds: ['p1', 'p2', 'p3'],
    bettorSelfExcluded: false,
  }
  await place.execute({ marketId: 't1', bettorId: 'u1', selectionId: 'p1', stake: 1000, ...OPEN_OUTRIGHT })
  await place.execute({ marketId: 't1', bettorId: 'u2', selectionId: 'p2', stake: 1000, ...OPEN_OUTRIGHT })
  await place.execute({ marketId: 't1', bettorId: 'u3', selectionId: 'p2', stake: 1000, ...OPEN_OUTRIGHT })

  // p1 is the champion (the underdog: single backer takes the whole pool).
  await new SettleMarket(repository).execute({ marketId: 't1', winningSelectionId: 'p1', rakeBasisPoints: 0 })

  const book = await new ListBetsByMarketQuery(repository).execute('t1')
  const champion = book.find((bet) => bet.selectionId === 'p1')!
  expect(champion.status).toBe('won')
  expect(champion.payout).toBe(3000)
  expect(book.filter((bet) => bet.selectionId === 'p2').every((bet) => bet.status === 'lost')).toBe(true)
})
