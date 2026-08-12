import { SetUserApproval, UserRepository, AuthSessionRepository } from '@auth/core'
import { AuthenticatedActor } from 'shared'
import { SetUserApprovalInput } from '../@types'

export default class SetUserApprovalController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(input: SetUserApprovalInput, actor: AuthenticatedActor): Promise<void> {
    const useCase = new SetUserApproval(this.userRepository, this.sessionRepository)
    await useCase.execute(input, actor)
  }
}
