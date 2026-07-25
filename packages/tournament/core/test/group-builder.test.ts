import { Errors, ValidationError } from 'shared'
import { GroupBuilder } from '../src'

describe('GroupBuilder', () => {
  test('a 64-participant field splits into 16 groups of 4 (6 matchups each)', () => {
    const ids = Array.from({ length: 64 }, (_, index) => `p${index}`)
    expect(GroupBuilder.groupCount(64)).toBe(16)

    const seeds = GroupBuilder.build(64, ids)
    expect(seeds).toHaveLength(16 * 6)

    const group0 = seeds.filter((seed) => seed.groupIndex === 0)
    expect(group0).toHaveLength(6)
    // Every pairwise combination among p0..p3, each matchupIndex used once.
    expect(new Set(group0.map((seed) => seed.matchupIndex)).size).toBe(6)
    const pairs = group0.map((seed) => [seed.playerAId, seed.playerBId].sort().join('-'))
    expect(new Set(pairs)).toEqual(
      new Set(['p0-p1', 'p0-p2', 'p0-p3', 'p1-p2', 'p1-p3', 'p2-p3']),
    )
  })

  test('rejects a size that is not divisible by the group size', () => {
    try {
      GroupBuilder.build(50, Array.from({ length: 50 }, (_, index) => `p${index}`))
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.INVALID_TOURNAMENT_SIZE)
    }
  })

  describe('seedKnockoutEntrants', () => {
    test('pairs consecutive groups crosswise so a group never faces itself round 0', () => {
      const topTwoPerGroup: [string, string][] = [
        ['g0-1', 'g0-2'],
        ['g1-1', 'g1-2'],
        ['g2-1', 'g2-2'],
        ['g3-1', 'g3-2'],
      ]
      const entrants = GroupBuilder.seedKnockoutEntrants(topTwoPerGroup)
      // [0]v[1] and [2]v[3] (adjacent pairing, as BracketBuilder.build expects).
      expect(entrants).toEqual(['g0-1', 'g1-2', 'g1-1', 'g0-2', 'g2-1', 'g3-2', 'g3-1', 'g2-2'])
    })
  })
})
