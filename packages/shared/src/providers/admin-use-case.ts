import { UseCase } from './use-case'
import { AuthenticatedActor } from '../model/authenticated-actor'
import { AccessDeniedError } from '../errors/access-denied-error'
import { Errors } from '../constants/errors'

/**
 * Role-guarded base use case (Template Method). Admin-only use cases EXTEND this
 * instead of implementing `UseCase` directly: the public `execute` enforces the
 * admin role (throws AccessDeniedError/NOT_ADMIN otherwise) and then delegates to
 * `executeAsAdmin`. Authorization is locked at the DOMAIN layer by inheritance,
 * on top of the backend's role guard at the edge — the same pattern as the
 * role-scoped base use cases in the reference project.
 */
export abstract class AdminUseCase<INPUT, OUTPUT> implements UseCase<INPUT, OUTPUT> {
  async execute(input: INPUT, actor: AuthenticatedActor, ...args: unknown[]): Promise<OUTPUT> {
    if (!actor || actor.role !== 'admin') {
      AccessDeniedError.throwError(Errors.NOT_ADMIN, actor?.id)
    }
    return this.executeAsAdmin(input, actor, ...args)
  }

  protected abstract executeAsAdmin(
    input: INPUT,
    actor: AuthenticatedActor,
    ...args: unknown[]
  ): Promise<OUTPUT>
}
