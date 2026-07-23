import { Bet, PayoutCalculator } from '../src'

// Helper: N bets of `stake` cents on `participantId`.
function bets(spec: { participantId: string; stake: number; count: number }[]): Bet[] {
  const result: Bet[] = []
  for (const entry of spec) {
    for (let index = 0; index < entry.count; index++) {
      result.push(
        new Bet({ matchId: 'm1', bettorId: `u-${entry.participantId}-${index}`, participantId: entry.participantId, stake: entry.stake }),
      )
    }
  }
  return result
}

test('the underdog pays more (7 on A vs 3 on B, R$10 each)', () => {
  const pool = bets([
    { participantId: 'A', stake: 1000, count: 7 },
    { participantId: 'B', stake: 1000, count: 3 },
  ])

  const bWins = PayoutCalculator.calculate(pool, 'B', 0)
  const bWinners = bWins.filter((outcome) => outcome.outcome === 'won')
  expect(bWinners).toHaveLength(3)
  // 1000 / 3000 * 10000 = 3333 (floor)
  expect(bWinners[0].payout).toBe(3333)

  const aWins = PayoutCalculator.calculate(pool, 'A', 0)
  const aWinners = aWins.filter((outcome) => outcome.outcome === 'won')
  // 1000 / 7000 * 10000 = 1428 (floor)
  expect(aWinners[0].payout).toBe(1428)
  expect(aWinners[0].payout).toBeLessThan(bWinners[0].payout)
})

test('losing bets get a zero payout', () => {
  const pool = bets([
    { participantId: 'A', stake: 1000, count: 1 },
    { participantId: 'B', stake: 1000, count: 1 },
  ])
  const outcomes = PayoutCalculator.calculate(pool, 'A', 0)
  const loser = outcomes.find((outcome) => outcome.outcome === 'lost')
  expect(loser?.payout).toBe(0)
})

test('nobody backed the winner -> everyone refunded', () => {
  const pool = bets([{ participantId: 'A', stake: 1000, count: 2 }])
  const outcomes = PayoutCalculator.calculate(pool, 'B', 0)
  expect(outcomes.every((outcome) => outcome.outcome === 'refunded')).toBe(true)
  expect(outcomes.every((outcome) => outcome.payout === 1000)).toBe(true)
})

test('no winner declared -> everyone refunded', () => {
  const pool = bets([
    { participantId: 'A', stake: 1000, count: 1 },
    { participantId: 'B', stake: 500, count: 1 },
  ])
  const outcomes = PayoutCalculator.calculate(pool, null, 0)
  expect(outcomes.map((outcome) => outcome.outcome)).toEqual(['refunded', 'refunded'])
})

test('rake reduces the distributable pool', () => {
  const pool = bets([
    { participantId: 'A', stake: 1000, count: 1 },
    { participantId: 'B', stake: 1000, count: 1 },
  ])
  // 5% rake: distributable = 2000 - 100 = 1900; single A winner gets floor(1000/1000*1900)=1900
  const outcomes = PayoutCalculator.calculate(pool, 'A', 500)
  const winner = outcomes.find((outcome) => outcome.outcome === 'won')
  expect(winner?.payout).toBe(1900)
})
