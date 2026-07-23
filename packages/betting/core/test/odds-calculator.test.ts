import { Bet, OddsCalculator } from '../src'

test('computes pools and indicative odds; the underdog shows the higher odd', () => {
  const pool = [
    new Bet({ matchId: 'm1', bettorId: 'u1', participantId: 'A', stake: 7000 }),
    new Bet({ matchId: 'm1', bettorId: 'u2', participantId: 'B', stake: 3000 }),
  ]

  const odds = OddsCalculator.calculate('m1', pool, 0)
  expect(odds.totalPool).toBe(10000)

  const a = odds.entries.find((entry) => entry.participantId === 'A')!
  const b = odds.entries.find((entry) => entry.participantId === 'B')!
  expect(a.pool).toBe(7000)
  expect(b.pool).toBe(3000)
  // A: 10000/7000 = 1.43 ; B: 10000/3000 = 3.33
  expect(a.impliedOdd).toBeCloseTo(1.43, 2)
  expect(b.impliedOdd).toBeCloseTo(3.33, 2)
  expect(b.impliedOdd).toBeGreaterThan(a.impliedOdd)
})

test('no bets -> empty book, zero pool', () => {
  const odds = OddsCalculator.calculate('m1', [], 0)
  expect(odds.totalPool).toBe(0)
  expect(odds.entries).toHaveLength(0)
})
