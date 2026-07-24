import { Errors, ValidationError } from 'shared'
import { BracketBuilder, BracketAdvancer } from '../src'

describe('BracketBuilder', () => {
  test('an 8-player bracket has 3 rounds and 7 slots', () => {
    const ids = Array.from({ length: 8 }, (_, index) => `p${index}`)
    const seeds = BracketBuilder.build(8, ids)
    expect(BracketBuilder.roundCount(8)).toBe(3)
    expect(seeds).toHaveLength(7) // 4 + 2 + 1

    const round0 = seeds.filter((seed) => seed.round === 0)
    expect(round0).toHaveLength(4)
    // Adjacent seeding: [0]v[1], [2]v[3], ...
    expect(round0[0]).toMatchObject({ position: 0, playerAId: 'p0', playerBId: 'p1' })
    expect(round0[3]).toMatchObject({ position: 3, playerAId: 'p6', playerBId: 'p7' })

    // Later rounds start empty (winners filled in as matches settle).
    for (const seed of seeds.filter((current) => current.round > 0)) {
      expect(seed.playerAId).toBeNull()
      expect(seed.playerBId).toBeNull()
    }
  })

  test('a 32-player bracket has 5 rounds and 31 slots', () => {
    const ids = Array.from({ length: 32 }, (_, index) => `p${index}`)
    expect(BracketBuilder.roundCount(32)).toBe(5)
    expect(BracketBuilder.build(32, ids)).toHaveLength(31)
  })

  test('rejects a size that is not a supported power of 2', () => {
    try {
      BracketBuilder.build(6, Array.from({ length: 6 }, (_, index) => `p${index}`))
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.INVALID_TOURNAMENT_SIZE)
    }
  })
})

describe('BracketAdvancer', () => {
  test('a round-0 winner feeds the parent slot on the right side', () => {
    expect(BracketAdvancer.parentOf(0, 0, 8)).toEqual({ round: 1, position: 0, side: 'A' })
    expect(BracketAdvancer.parentOf(0, 1, 8)).toEqual({ round: 1, position: 0, side: 'B' })
    expect(BracketAdvancer.parentOf(0, 3, 8)).toEqual({ round: 1, position: 1, side: 'B' })
  })

  test('the final has no parent (its winner is the champion)', () => {
    expect(BracketAdvancer.parentOf(2, 0, 8)).toBeNull()
  })
})
