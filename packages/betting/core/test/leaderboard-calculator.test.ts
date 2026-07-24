import { Money } from 'shared'
import { Bet, LeaderboardCalculator } from '../src'

function settled(bettorId: string, stake: number, status: 'won' | 'lost', payout = 0): Bet {
  const bet = new Bet({ marketId: 'm1', bettorId, selectionId: 'A', stake })
  if (status === 'won') bet.settleAsWinner(new Money(payout))
  else bet.settleAsLoser()
  return bet
}

test('ranks bettors by net profit desc', () => {
  const bets = [
    settled('u1', 1000, 'won', 2500), // +1500
    settled('u2', 1000, 'lost'), // -1000
    settled('u3', 5000, 'won', 5500), // +500
  ]

  const ranking = LeaderboardCalculator.calculate(bets)
  expect(ranking.map((entry) => entry.bettorId)).toEqual(['u1', 'u3', 'u2'])
  expect(ranking[0].netProfit).toBe(1500)
  expect(ranking[0].betsWon).toBe(1)
  expect(ranking[1].netProfit).toBe(500)
  expect(ranking[2].netProfit).toBe(-1000)
})

test('aggregates multiple bets from the same bettor', () => {
  const bets = [settled('u1', 1000, 'won', 2000), settled('u1', 1000, 'lost'), settled('u1', 1000, 'won', 1800)]

  const ranking = LeaderboardCalculator.calculate(bets)
  expect(ranking).toHaveLength(1)
  expect(ranking[0].betsSettled).toBe(3)
  expect(ranking[0].betsWon).toBe(2)
  expect(ranking[0].totalStaked).toBe(3000)
  expect(ranking[0].totalPayout).toBe(3800)
  expect(ranking[0].netProfit).toBe(800)
})

test('ignores open and refunded bets', () => {
  const open = new Bet({ marketId: 'm1', bettorId: 'u1', selectionId: 'A', stake: 1000 })
  const refunded = new Bet({ marketId: 'm1', bettorId: 'u2', selectionId: 'A', stake: 1000 })
  refunded.refund()

  const ranking = LeaderboardCalculator.calculate([open, refunded])
  expect(ranking).toHaveLength(0)
})

test('respects the limit', () => {
  const bets = [
    settled('u1', 1000, 'won', 3000),
    settled('u2', 1000, 'won', 2000),
    settled('u3', 1000, 'won', 1000),
  ]

  const ranking = LeaderboardCalculator.calculate(bets, 2)
  expect(ranking).toHaveLength(2)
  expect(ranking.map((entry) => entry.bettorId)).toEqual(['u1', 'u2'])
})

test('no settled bets -> empty ranking', () => {
  expect(LeaderboardCalculator.calculate([])).toHaveLength(0)
})
