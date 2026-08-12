import { ListUsersQuery, UserQueryRepository, UserDTO } from '@auth/core'
import { AuthenticatedActor } from 'shared'

export default class ListUsersController {
  constructor(private readonly userQueryRepository: UserQueryRepository) {}

  async execute(actor: AuthenticatedActor): Promise<UserDTO[]> {
    const useCase = new ListUsersQuery(this.userQueryRepository)
    return useCase.execute(undefined, actor)
  }
}
