import { GetOddsHistoryQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

test('lists recorded odds snapshots for a market, oldest first', async () => {
  const repository = new BettingRepositoryInMemory()
  repository.oddsSnapshots.push(
    {
      marketId: 'm1',
      selectionId: 'A',
      pool: 2000,
      totalPool: 3000,
      impliedOdd: 1.5,
      recordedAt: new Date('2026-01-02'),
    },
    {
      marketId: 'm1',
      selectionId: 'A',
      pool: 1000,
      totalPool: 1000,
      impliedOdd: 1,
      recordedAt: new Date('2026-01-01'),
    },
    {
      marketId: 'm2',
      selectionId: 'B',
      pool: 500,
      totalPool: 500,
      impliedOdd: 1,
      recordedAt: new Date('2026-01-01'),
    },
  )

  const history = await new GetOddsHistoryQuery(repository).execute('m1')
  expect(history).toHaveLength(2)
  expect(history[0].recordedAt.getTime()).toBeLessThan(history[1].recordedAt.getTime())
  expect(history.every((snapshot) => snapshot.selectionId === 'A')).toBe(true)
})

test('no snapshots -> empty history', async () => {
  const repository = new BettingRepositoryInMemory()
  const history = await new GetOddsHistoryQuery(repository).execute('m1')
  expect(history).toHaveLength(0)
})
