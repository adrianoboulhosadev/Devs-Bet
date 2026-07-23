import { RegisterUser, UserRepository, HashProvider } from '@auth/core'
import { RegisterUserInput } from '../@types'

export default class RegisterUserController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  async execute(input: RegisterUserInput): Promise<void> {
    const useCase = new RegisterUser(this.userRepository, this.hashProvider)
    await useCase.execute(input)
  }
}
