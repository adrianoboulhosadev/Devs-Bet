import { AuthenticatedActor, AccessDeniedError, ValidationError, ConflictError, NotFoundError, Errors } from 'shared'
import {
  Participant,
  CreateParticipant,
  UpdateParticipant,
  DeleteParticipant,
  ListParticipantsQuery,
} from '../src'
import { ParticipantRepositoryInMemory } from './in-memory'

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }

test('Participant requires a name', () => {
  expect(() => new Participant({ name: '  ' })).toThrow(ValidationError)
})

test('nickname/imageUrl are optional', () => {
  const participant = new Participant({ name: 'Faker' })
  expect(participant.nickname).toBeNull()
  expect(participant.imageUrl).toBeNull()
})

test('admin creates a participant', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker', nickname: 'The Unkillable Demon King' }, admin)

  const all = await new ListParticipantsQuery(repository).execute()
  expect(all).toHaveLength(1)
  expect(all[0]).toMatchObject({ name: 'Faker', nickname: 'The Unkillable Demon King' })
})

test('a non-admin cannot create a participant (NOT_ADMIN)', async () => {
  const repository = new ParticipantRepositoryInMemory()
  const create = new CreateParticipant(repository).execute({ name: 'Faker' }, user)
  await expect(create).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(create).rejects.toMatchObject({ code: Errors.NOT_ADMIN })
})

test('duplicate name is rejected (PARTICIPANT_ALREADY_EXISTS)', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  const dup = new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  await expect(dup).rejects.toBeInstanceOf(ConflictError)
  await expect(dup).rejects.toMatchObject({ code: Errors.PARTICIPANT_ALREADY_EXISTS })
})

test('admin renames a participant, keeping uniqueness', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  await new CreateParticipant(repository).execute({ name: 'Chovy' }, admin)
  const chovy = repository.participants[1].id

  const clash = new UpdateParticipant(repository).execute({ participantId: chovy, name: 'Faker' }, admin)
  await expect(clash).rejects.toMatchObject({ code: Errors.PARTICIPANT_ALREADY_EXISTS })

  await new UpdateParticipant(repository).execute({ participantId: chovy, name: 'Chovy Jeong' }, admin)
  expect(repository.participants[1].name).toBe('Chovy Jeong')
})

test('re-sending the SAME name (editing only nickname/image) does not self-conflict', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  const faker = repository.participants[0].id

  // The edit form always resends `name`, so an unchanged name must be accepted.
  await new UpdateParticipant(repository).execute(
    { participantId: faker, name: 'Faker', nickname: 'Demon King' },
    admin,
  )

  expect(repository.participants[0].name).toBe('Faker')
  expect(repository.participants[0].nickname).toBe('Demon King')
})

test('updating a missing participant fails (PARTICIPANT_NOT_FOUND)', async () => {
  const repository = new ParticipantRepositoryInMemory()
  const update = new UpdateParticipant(repository).execute({ participantId: 'ghost', name: 'x' }, admin)
  await expect(update).rejects.toBeInstanceOf(NotFoundError)
  await expect(update).rejects.toMatchObject({ code: Errors.PARTICIPANT_NOT_FOUND })
})

test('deleting an unused participant works', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  const faker = repository.participants[0].id

  await new DeleteParticipant(repository).execute({ participantId: faker, isInUse: false }, admin)
  expect(repository.participants).toHaveLength(0)
})

test('deleting a participant already used in a match/tournament is refused (PARTICIPANT_IN_USE)', async () => {
  const repository = new ParticipantRepositoryInMemory()
  await new CreateParticipant(repository).execute({ name: 'Faker' }, admin)
  const faker = repository.participants[0].id

  const remove = new DeleteParticipant(repository).execute({ participantId: faker, isInUse: true }, admin)
  await expect(remove).rejects.toBeInstanceOf(ConflictError)
  await expect(remove).rejects.toMatchObject({ code: Errors.PARTICIPANT_IN_USE })
  expect(repository.participants).toHaveLength(1)
})
