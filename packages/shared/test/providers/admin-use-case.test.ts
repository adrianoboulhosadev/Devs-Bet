import { AdminUseCase, AuthenticatedActor, AccessDeniedError, Errors } from '../../src'

class DeleteEverything extends AdminUseCase<{ target: string }, string> {
  protected async executeAsAdmin(input: { target: string }): Promise<string> {
    return `deleted ${input.target}`
  }
}

const admin: AuthenticatedActor = { id: 'admin-1', role: 'admin' }
const user: AuthenticatedActor = { id: 'user-1', role: 'user' }

test('runs the delegated action for an admin actor', async () => {
  const useCase = new DeleteEverything()
  await expect(useCase.execute({ target: 'logs' }, admin)).resolves.toBe('deleted logs')
})

test('blocks a non-admin actor with AccessDeniedError/NOT_ADMIN', async () => {
  const useCase = new DeleteEverything()
  await expect(useCase.execute({ target: 'logs' }, user)).rejects.toBeInstanceOf(AccessDeniedError)
  await expect(useCase.execute({ target: 'logs' }, user)).rejects.toMatchObject({
    code: Errors.NOT_ADMIN,
  })
})

test('blocks a missing actor', async () => {
  const useCase = new DeleteEverything()
  await expect(
    useCase.execute({ target: 'logs' }, undefined as unknown as AuthenticatedActor),
  ).rejects.toBeInstanceOf(AccessDeniedError)
})
