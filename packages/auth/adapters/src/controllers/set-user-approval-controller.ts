import { SetUserApproval, UserRepository, AuthSessionRepository } from '@auth/core'
import { AuthenticatedActor, EventPublisher } from 'shared'
import { SetUserApprovalInput } from '../@types'

export default class SetUserApprovalController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: SetUserApprovalInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new SetUserApproval(
      this.userRepository,
      this.sessionRepository,
      this.eventPublisher,
    )
    await useCase.execute(input, actor)
  }
}
