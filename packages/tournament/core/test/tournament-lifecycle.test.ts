import { AuthenticatedActor, AccessDeniedError, ValidationError, Errors } from 'shared'
import {
  CreateTournament,
  CancelTournament,
  RecordBracketResult,
  GetTournamentQuery,
  ListTournamentsQuery,
} from '../src'
import { TournamentRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000)

const createInput = (overrides: Partial<Parameters<CreateTournament['execute']>[0]> = {}) => ({
  title: 'Champions Cup',
  categoryId: 'cat-leaf',
  categoryIsLeaf: true,
  scheduledAt: inOneHour(),
  size: 4,
  participants: [
    { displayName: 'A' },
    { displayName: 'B' },
    { displayName: 'C' },
    { displayName: 'D' },
  ],
  ...overrides,
})

describe('CreateTournament', () => {
  test('a non-admin cannot create a tournament (NOT_ADMIN)', async () => {
    const repository = new TournamentRepositoryInMemory()
    try {
      await new CreateTournament(repository).execute(createInput(), user)
      fail('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AccessDeniedError)
      expect((error as AccessDeniedError).code).toBe(Errors.NOT_ADMIN)
    }
  })

  test('a non-leaf category is rejected (CATEGORY_NOT_LEAF)', async () => {
    const repository = new TournamentRepositoryInMemory()
    try {
      await new CreateTournament(repository).execute(createInput({ categoryIsLeaf: false }), admin)
      fail('should have thrown')
    } catch (error) {
      expect((error as ValidationError).code).toBe(Errors.CATEGORY_NOT_LEAF)
    }
  })

  test('an admin creates the tournament and its bracket', async () => {
    const repository = new TournamentRepositoryInMemory()
    await new CreateTournament(repository).execute(createInput(), admin)

    const [row] = repository.tournaments
    const dto = await new GetTournamentQuery(repository).execute(row.id)
    expect(dto.size).toBe(4)
    expect(dto.status).toBe('in_progress')
    expect(dto.bracket).toHaveLength(3) // 2 semifinals + 1 final
    const round0 = dto.bracket.filter((slot) => slot.round === 0)
    expect(round0).toHaveLength(2)
    expect(round0[0].playerA?.displayName).toBe('A')
    expect(round0[0].playerB?.displayName).toBe('B')
    // The final starts empty.
    expect(dto.bracket.find((slot) => slot.round === 1)?.playerA).toBeNull()

    expect(await new ListTournamentsQuery(repository).execute()).toHaveLength(1)
  })
})

describe('RecordBracketResult', () => {
  test('advances the winner into the next round (persisted)', async () => {
    const repository = new TournamentRepositoryInMemory()
    await new CreateTournament(repository).execute(createInput(), admin)
    const [row] = repository.tournaments

    // The backend attaches the Match it created for a ready round-0 slot.
    const aggregate = (await repository.findAggregate(row.id))!
    const round0 = aggregate.slots.find((slot) => slot.round === 0 && slot.position === 0)!
    aggregate.attachMatch(0, 0, 'match-00')
    await repository.update(aggregate)

    const winnerName = aggregate.participantName(round0.playerAId)! // 'A'
    await new RecordBracketResult(repository).execute({
      tournamentId: row.id,
      matchId: 'match-00',
      winnerDisplayName: winnerName,
    })

    const dto = await new GetTournamentQuery(repository).execute(row.id)
    const final = dto.bracket.find((slot) => slot.round === 1)!
    expect(final.playerA?.displayName).toBe('A')
  })
})

describe('CancelTournament', () => {
  test('an admin cancels the tournament', async () => {
    const repository = new TournamentRepositoryInMemory()
    await new CreateTournament(repository).execute(createInput(), admin)
    const [row] = repository.tournaments

    await new CancelTournament(repository).execute({ tournamentId: row.id }, admin)
    const dto = await new GetTournamentQuery(repository).execute(row.id)
    expect(dto.status).toBe('cancelled')
  })
})
