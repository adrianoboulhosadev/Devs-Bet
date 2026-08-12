import { AdminUseCase, AuthenticatedActor, EventPublisher, AccessDeniedError, NotFoundError, Errors } from 'shared'
import { ApprovalStatus } from '../model'
import { UserRepository, AuthSessionRepository } from '../providers'

interface Input {
  userId: string
  status: Extract<ApprovalStatus, 'approved' | 'rejected'>
}

/**
 * The platform's front door: an admin releases a sign-up or bars an account.
 * Barring doubles as REVOKING access from someone already in, so it also tears
 * down every open session — otherwise the person would keep browsing until
 * their access token expired.
 */
export default class SetUserApproval extends AdminUseCase<Input, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {
    super()
  }

  protected async executeAsAdmin({ userId, status }: Input, actor: AuthenticatedActor): Promise<void> {
    // An admin cannot change their own status: revoking yourself would leave
    // nobody able to release anyone, locking the whole platform.
    if (userId === actor.id) AccessDeniedError.throwError(Errors.NOT_ADMIN, actor.id)

    const user = await this.repository.findById(userId)
    if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND, userId)

    if (status === 'approved') user.approve()
    else user.reject()

    await this.repository.updateApprovalStatus(userId, user.approvalStatus)
    if (!user.isApproved) await this.sessionRepository.deleteAllByUser(userId)

    // Publishes UserApproved on approve, and NOTHING on reject (reject()
    // never records) — no `if` needed here, the entity already decided.
    await this.eventPublisher?.publish(user.pullDomainEvents())
  }
}
