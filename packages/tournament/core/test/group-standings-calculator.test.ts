import { GroupStandingsCalculator } from '../src'

describe('GroupStandingsCalculator', () => {
  const participantIds = ['A', 'B', 'C', 'D']

  test('ranks by wins when there is no tie', () => {
    const matches = [
      { playerAId: 'A', playerBId: 'B', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'A', playerBId: 'C', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 1 },
      { playerAId: 'A', playerBId: 'D', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'C', winnerParticipantId: 'B', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'D', winnerParticipantId: 'D', unitsWonByA: 0, unitsWonByB: 2 },
      { playerAId: 'C', playerBId: 'D', winnerParticipantId: 'D', unitsWonByA: 0, unitsWonByB: 2 },
    ]
    const standings = GroupStandingsCalculator.calculate(participantIds, matches)
    expect(standings.map((entry) => entry.participantId)).toEqual(['A', 'D', 'B', 'C'])
    expect(standings[0].wins).toBe(3)
  })

  test('breaks a tie by head-to-head result before unit differential', () => {
    // A and B both finish 2-1; A beat B head-to-head, so A ranks first even
    // though B has a better overall unit differential.
    const matches = [
      { playerAId: 'A', playerBId: 'B', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 1 },
      { playerAId: 'A', playerBId: 'C', winnerParticipantId: 'C', unitsWonByA: 0, unitsWonByB: 2 },
      { playerAId: 'A', playerBId: 'D', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'C', winnerParticipantId: 'B', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'D', winnerParticipantId: 'B', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'C', playerBId: 'D', winnerParticipantId: 'D', unitsWonByA: 0, unitsWonByB: 2 },
    ]
    const standings = GroupStandingsCalculator.calculate(participantIds, matches)
    expect(standings[0].participantId).toBe('A')
    expect(standings[1].participantId).toBe('B')
    expect(standings[0].wins).toBe(2)
    expect(standings[1].wins).toBe(2)
  })

  test('falls back to overall unit differential when head-to-head is inconclusive', () => {
    // A 3-way tie at 1 win each, all decided against the 0-win D — no
    // head-to-head games exist among A/B/C themselves, so unit diff decides.
    const matches = [
      { playerAId: 'A', playerBId: 'D', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'D', winnerParticipantId: 'B', unitsWonByA: 2, unitsWonByB: 1 },
      { playerAId: 'C', playerBId: 'D', winnerParticipantId: 'C', unitsWonByA: 2, unitsWonByB: 1 },
      { playerAId: 'A', playerBId: 'B', winnerParticipantId: null, unitsWonByA: 0, unitsWonByB: 0 },
      { playerAId: 'A', playerBId: 'C', winnerParticipantId: null, unitsWonByA: 0, unitsWonByB: 0 },
      { playerAId: 'B', playerBId: 'C', winnerParticipantId: null, unitsWonByA: 0, unitsWonByB: 0 },
    ]
    const standings = GroupStandingsCalculator.calculate(participantIds, matches)
    // A: +2, B: +1, C: +1 (then alphabetical between B and C).
    expect(standings.map((entry) => entry.participantId).slice(0, 3)).toEqual(['A', 'B', 'C'])
  })

  test('ignores unsettled matches (usable as a live mid-group-stage view)', () => {
    const matches = [
      { playerAId: 'A', playerBId: 'B', winnerParticipantId: 'A', unitsWonByA: 2, unitsWonByB: 0 },
      { playerAId: 'C', playerBId: 'D', winnerParticipantId: null, unitsWonByA: 0, unitsWonByB: 0 },
    ]
    const standings = GroupStandingsCalculator.calculate(participantIds, matches)
    expect(standings.find((entry) => entry.participantId === 'A')?.wins).toBe(1)
    expect(standings.find((entry) => entry.participantId === 'C')?.wins).toBe(0)
  })
})
