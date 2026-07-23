import { LogoutUser, AuthSessionRepository, HashProvider } from '@auth/core'

export default class LogoutUserController {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  // userId comes from the JWT (HTTP boundary); refreshToken comes from the cookie.
  async execute(userId: string, refreshToken?: string): Promise<void> {
    const useCase = new LogoutUser(this.sessionRepository, this.hashProvider)
    await useCase.execute({ userId, refreshToken })
  }
}
