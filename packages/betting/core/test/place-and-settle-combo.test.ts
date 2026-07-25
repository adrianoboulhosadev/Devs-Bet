import { PlaceComboBet, SettleMarket, RefundMarket, ListMyComboBetsQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

const LEG = (marketId: string, selectionId: string, odd: number) => ({
  marketType: 'match' as const,
  marketId,
  selectionId,
  odd,
  marketOpen: true,
  selectionIds: ['A', 'B', 'X', 'Y'],
})

test('places a combo ticket across two markets', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceComboBet(repository, repository).execute({
    bettorId: 'u1',
    stake: 1000,
    legs: [LEG('m1', 'A', 1.5), LEG('m2', 'X', 2)],
    bettorSelfExcluded: false,
  })

  expect(repository.combos).toHaveLength(1)
  expect(repository.combos[0].totalOdd).toBe(3)
})

test('winning every leg settles the ticket as won with the fixed combined odd', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceComboBet(repository, repository).execute({
    bettorId: 'u1',
    stake: 1000,
    legs: [LEG('m1', 'A', 1.5), LEG('m2', 'X', 2)],
    bettorSelfExcluded: false,
  })

  await new SettleMarket(repository).execute({ marketId: 'm1', winningSelectionId: 'A', rakeBasisPoints: 0 })
  let [combo] = await new ListMyComboBetsQuery(repository).execute('u1')
  expect(combo.status).toBe('open') // m2 still pending

  await new SettleMarket(repository).execute({ marketId: 'm2', winningSelectionId: 'X', rakeBasisPoints: 500 })
  ;[combo] = await new ListMyComboBetsQuery(repository).execute('u1')
  expect(combo.status).toBe('won')
  expect(combo.payout).toBe(3000) // fixed odd, unaffected by m2's rake/pool
})

test('losing one leg settles the ticket as lost, regardless of the other leg', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceComboBet(repository, repository).execute({
    bettorId: 'u1',
    stake: 1000,
    legs: [LEG('m1', 'A', 1.5), LEG('m2', 'X', 2)],
    bettorSelfExcluded: false,
  })

  await new SettleMarket(repository).execute({ marketId: 'm1', winningSelectionId: 'B', rakeBasisPoints: 0 })

  const [combo] = await new ListMyComboBetsQuery(repository).execute('u1')
  expect(combo.status).toBe('lost')
  expect(combo.payout).toBe(0)
})

test('cancelling a leg market refunds the whole ticket once every leg resolves', async () => {
  const repository = new BettingRepositoryInMemory()
  await new PlaceComboBet(repository, repository).execute({
    bettorId: 'u1',
    stake: 1000,
    legs: [LEG('m1', 'A', 1.5), LEG('m2', 'X', 2)],
    bettorSelfExcluded: false,
  })

  await new SettleMarket(repository).execute({ marketId: 'm1', winningSelectionId: 'A', rakeBasisPoints: 0 })
  await new RefundMarket(repository).execute({ marketId: 'm2' })

  const [combo] = await new ListMyComboBetsQuery(repository).execute('u1')
  expect(combo.status).toBe('refunded')
  expect(combo.payout).toBe(1000)
})
