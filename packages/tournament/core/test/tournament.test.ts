import { Errors, ValidationError, ConflictError } from 'shared'
import { Tournament } from '../src'

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ displayName: `P${index}` }))

function newTournament(size = 8) {
  return new Tournament({
    creatorId: 'creator-1',
    title: 'Champions Cup',
    categoryId: 'cat-leaf',
    scheduledAt: inOneHour(),
    size,
    participants: names(size),
  })
}

describe('Tournament invariants', () => {
  test('a new tournament starts in_progress with a full bracket', () => {
    const tournament = newTournament(8)
    expect(tournament.status).toBe('in_progress')
    expect(tournament.roundCount).toBe(3)
    expect(tournament.slots).toHaveLength(7)
    // Round 0 is ready and awaiting matches; the rest is empty.
    expect(tournament.pendingMatchSlots()).toHaveLength(4)
  })

  test('rejects an invalid size (INVALID_TOURNAMENT_SIZE)', () => {
    try {
      new Tournament({
        creatorId: 'c',
        title: 'X',
        categoryId: 'cat-leaf',
        scheduledAt: inOneHour(),
        size: 6,
        participants: names(6),
      })
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.INVALID_TOURNAMENT_SIZE)
    }
  })

  test('requires exactly `size` participants (NOT_ENOUGH_TOURNAMENT_PARTICIPANTS)', () => {
    try {
      new Tournament({
        creatorId: 'c',
        title: 'X',
        categoryId: 'cat-leaf',
        scheduledAt: inOneHour(),
        size: 4,
        participants: names(3),
      })
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.NOT_ENOUGH_TOURNAMENT_PARTICIPANTS)
    }
  })

  test('rejects duplicate participant names (DUPLICATE_PARTICIPANT_NAME)', () => {
    try {
      new Tournament({
        creatorId: 'c',
        title: 'X',
        categoryId: 'cat-leaf',
        scheduledAt: inOneHour(),
        size: 4,
        participants: [
          { displayName: 'A' },
          { displayName: 'A' },
          { displayName: 'B' },
          { displayName: 'C' },
        ],
      })
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.DUPLICATE_PARTICIPANT_NAME)
    }
  })

  test('a new tournament cannot start in the past (SCHEDULED_IN_PAST)', () => {
    try {
      new Tournament({
        creatorId: 'c',
        title: 'X',
        categoryId: 'cat-leaf',
        scheduledAt: new Date(Date.now() - 1000),
        size: 4,
        participants: names(4),
      })
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.SCHEDULED_IN_PAST)
    }
  })

  test('reconstitution (with slots) does not re-run the not-in-the-past rule', () => {
    const built = newTournament(4)
    const past = new Tournament({
      id: built.id.value,
      creatorId: 'c',
      title: 'X',
      categoryId: 'cat-leaf',
      scheduledAt: new Date(Date.now() - 1000),
      size: 4,
      participants: built.participants.map((participant) => ({
        id: participant.id.value,
        displayName: participant.displayName,
      })),
      slots: built.slots.map((slot) => ({
        id: slot.id.value,
        round: slot.round,
        position: slot.position,
        matchId: slot.matchId,
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
      })),
    })
    expect(past.status).toBe('in_progress')
  })
})

describe('Tournament bracket advancement', () => {
  // Plays every confrontation, always letting the A-side player win, and asserts
  // the whole bracket resolves to a single champion.
  test('winners advance round by round until a champion is crowned', () => {
    const tournament = newTournament(8)

    const playRound = () => {
      for (const slot of tournament.pendingMatchSlots()) {
        const matchId = `m-${slot.round}-${slot.position}`
        tournament.attachMatch(slot.round, slot.position, matchId)
        const winnerName = tournament.participantName(slot.playerAId)!
        tournament.recordResult(matchId, winnerName)
      }
    }

    playRound() // round 0 → fills round 1
    expect(tournament.status).toBe('in_progress')
    expect(tournament.pendingMatchSlots()).toHaveLength(2) // the two semifinals

    playRound() // round 1 → fills the final
    expect(tournament.pendingMatchSlots()).toHaveLength(1)

    playRound() // final → champion
    expect(tournament.status).toBe('finished')
    // Always the A-side winner of slot (0,0) = P0.
    expect(tournament.participantName(tournament.championParticipantId)).toBe('P0')
  })

  test('recording a result for an unknown match fails (BRACKET_SLOT_NOT_FOUND)', () => {
    const tournament = newTournament(4)
    try {
      tournament.recordResult('nope', 'P0')
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.BRACKET_SLOT_NOT_FOUND)
    }
  })

  test('the winner must be one of the slot players (NOT_A_PARTICIPANT)', () => {
    const tournament = newTournament(4)
    const slot = tournament.pendingMatchSlots()[0]
    tournament.attachMatch(slot.round, slot.position, 'm')
    try {
      tournament.recordResult('m', 'Nobody')
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.NOT_A_PARTICIPANT)
    }
  })

  test('cancel marks cancelled; cancelling a finished tournament fails', () => {
    const open = newTournament(2)
    open.cancel()
    expect(open.status).toBe('cancelled')

    const finished = newTournament(2)
    const slot = finished.pendingMatchSlots()[0]
    finished.attachMatch(slot.round, slot.position, 'm')
    finished.recordResult('m', finished.participantName(slot.playerAId)!)
    expect(finished.status).toBe('finished')
    expect(() => finished.cancel()).toThrow(ConflictError)
  })
})
