import { ChangePassword, UserRepository, HashProvider } from '@auth/core'
import { ChangePasswordInput } from '../@types'

export default class ChangePasswordController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  // userId comes from the JWT (HTTP boundary), not from the request body.
  async execute(input: ChangePasswordInput, userId: string): Promise<void> {
    const useCase = new ChangePassword(this.userRepository, this.hashProvider)
    await useCase.execute({ userId, ...input })
  }
}
