import { Money } from 'shared'
import { Bet, ComboBetDTO, LevelCalculator } from '../src'

function settled(bettorId: string, status: 'won' | 'lost', payout = 0): Bet {
  const bet = new Bet({ marketId: 'm1', bettorId, selectionId: 'A', stake: 1000 })
  if (status === 'won') bet.settleAsWinner(new Money(payout))
  else bet.settleAsLoser()
  return bet
}

function combo(bettorId: string, status: 'won' | 'lost' | 'open', legCount: number): ComboBetDTO {
  return {
    id: `combo-${bettorId}-${legCount}`,
    bettorId,
    legs: Array.from({ length: legCount }, () => ({
      marketType: 'match',
      marketId: 'm1',
      selectionId: 'A',
      odd: 2,
      result: 'pending',
    })),
    stake: 1000,
    totalOdd: 2 ** legCount,
    status,
    payout: status === 'won' ? 1000 * 2 ** legCount : 0,
    createdAt: new Date(),
    settledAt: status === 'open' ? null : new Date(),
  }
}

describe('xpForWin', () => {
  test('grows super-linearly with legs', () => {
    expect(LevelCalculator.xpForWin(1)).toBe(10)
    expect(LevelCalculator.xpForWin(2)).toBe(25)
    expect(LevelCalculator.xpForWin(3)).toBe(42)
    expect(LevelCalculator.xpForWin(4)).toBe(61)
  })
})

describe('levelFor', () => {
  test('boundaries of the progressive curve (100 * (L-1) * L / 2)', () => {
    expect(LevelCalculator.levelFor(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNextLevel: 100 })
    expect(LevelCalculator.levelFor(99)).toEqual({ level: 1, xpIntoLevel: 99, xpToNextLevel: 1 })
    expect(LevelCalculator.levelFor(100)).toEqual({ level: 2, xpIntoLevel: 0, xpToNextLevel: 200 })
    expect(LevelCalculator.levelFor(300)).toEqual({ level: 3, xpIntoLevel: 0, xpToNextLevel: 300 })
    expect(LevelCalculator.levelFor(301)).toEqual({ level: 3, xpIntoLevel: 1, xpToNextLevel: 299 })
  })
})

describe('calculate', () => {
  test('a simple win grants xpForWin(1)', () => {
    const stats = LevelCalculator.calculate([settled('u1', 'won', 2000)], [])
    expect(stats.wins).toBe(1)
    expect(stats.losses).toBe(0)
    expect(stats.xp).toBe(10)
    expect(stats.level).toBe(1)
  })

  test('a won combo grants xpForWin(legs), scaled by its own leg count', () => {
    const stats = LevelCalculator.calculate([], [combo('u1', 'won', 3)])
    expect(stats.wins).toBe(1)
    expect(stats.xp).toBe(42)
  })

  test('losses count toward the tally but grant no XP', () => {
    const stats = LevelCalculator.calculate([settled('u1', 'lost')], [combo('u1', 'lost', 2)])
    expect(stats.wins).toBe(0)
    expect(stats.losses).toBe(2)
    expect(stats.xp).toBe(0)
  })

  test('open combos are ignored entirely (no wins/losses/xp)', () => {
    const stats = LevelCalculator.calculate([], [combo('u1', 'open', 2)])
    expect(stats).toEqual({ wins: 0, losses: 0, xp: 0, level: 1, xpIntoLevel: 0, xpToNextLevel: 100 })
  })

  test('accumulates XP across simple wins and combo wins into one level', () => {
    // 10 (simple) + 42 (3-leg combo) + 61 (4-leg combo) = 113 XP -> level 2
    const stats = LevelCalculator.calculate(
      [settled('u1', 'won', 2000)],
      [combo('u1', 'won', 3), combo('u1', 'won', 4)],
    )
    expect(stats.xp).toBe(113)
    expect(stats.level).toBe(2)
    expect(stats.xpIntoLevel).toBe(13)
    expect(stats.xpToNextLevel).toBe(187)
  })
})
