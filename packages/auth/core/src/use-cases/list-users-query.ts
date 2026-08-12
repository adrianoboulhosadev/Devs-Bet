import { AdminUseCase } from 'shared'
import { UserDTO } from '../model'
import { UserQueryRepository } from '../providers'

/** Read side (CQRS): every account, for the admin's sign-up queue. */
export default class ListUsersQuery extends AdminUseCase<void, UserDTO[]> {
  constructor(private readonly userQueryRepository: UserQueryRepository) {
    super()
  }

  protected async executeAsAdmin(): Promise<UserDTO[]> {
    return this.userQueryRepository.listUsersQuery()
  }
}
