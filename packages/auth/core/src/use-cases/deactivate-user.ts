import { UseCase, NotFoundError, Errors } from 'shared'
import { UserRepository } from '../providers'

/**
 * Soft-delete of the identity (active=false). Does NOT erase data: the
 * definitive deletion with cross-context cascade is DeleteAccount, orchestrated
 * in the backend. Anti-IDOR lives at the HTTP boundary — the backend only calls
 * with the authenticated userId.
 */
export default class DeactivateUser implements UseCase<string, void> {
  constructor(private readonly repository: UserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND)

    await this.repository.deactivate(userId)
  }
}
