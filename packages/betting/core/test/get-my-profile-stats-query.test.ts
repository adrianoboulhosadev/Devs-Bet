import { Money } from 'shared'
import { Bet, GetMyProfileStatsQuery } from '../src'
import { BettingRepositoryInMemory } from './in-memory'

test('combines settled simple bets and combo tickets into one XP/level read model', async () => {
  const repository = new BettingRepositoryInMemory()

  const won = new Bet({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 1000 })
  won.settleAsWinner(new Money(2000))
  repository.bets.push(won)

  const lost = new Bet({ marketId: 'm2', bettorId: 'u1', selectionId: 'A', stake: 1000 })
  lost.settleAsLoser()
  repository.bets.push(lost)

  // A bet from someone else must not leak into u1's stats.
  const othersBet = new Bet({ marketId: 'm3', bettorId: 'u2', selectionId: 'A', stake: 1000 })
  othersBet.settleAsWinner(new Money(2000))
  repository.bets.push(othersBet)

  const query = new GetMyProfileStatsQuery(repository)
  const stats = await query.execute('u1')

  expect(stats.wins).toBe(1)
  expect(stats.losses).toBe(1)
  expect(stats.xp).toBe(10)
  expect(stats.level).toBe(1)
})
