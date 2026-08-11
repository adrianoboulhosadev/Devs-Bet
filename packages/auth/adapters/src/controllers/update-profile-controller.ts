import { UpdateProfile, UserRepository } from '@auth/core'
import { UpdateProfileInput } from '../@types'

export default class UpdateProfileController {
  constructor(private readonly userRepository: UserRepository) {}

  // userId comes from the JWT (HTTP boundary).
  async execute(input: UpdateProfileInput, userId: string): Promise<void> {
    const useCase = new UpdateProfile(this.userRepository)
    await useCase.execute({ userId, ...input })
  }
}
