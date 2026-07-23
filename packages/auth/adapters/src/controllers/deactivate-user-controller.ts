import { DeactivateUser, UserRepository } from '@auth/core'

export default class DeactivateUserController {
  constructor(private readonly userRepository: UserRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(userId: string): Promise<void> {
    const useCase = new DeactivateUser(this.userRepository)
    await useCase.execute(userId)
  }
}
