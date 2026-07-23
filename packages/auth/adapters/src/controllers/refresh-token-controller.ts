import {
  RefreshToken,
  JwtProvider,
  JwtTokens,
  AuthSessionRepository,
  HashProvider,
  UserRepository,
} from '@auth/core'

export default class RefreshTokenController {
  constructor(
    private readonly jwtProvider: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
    private readonly hashProvider: HashProvider,
    private readonly userRepository: UserRepository,
  ) {}

  // Receives the refresh JWT (from the cookie) and returns the rotated pair (access + new refresh).
  async execute(token: string, secret: string): Promise<JwtTokens> {
    const useCase = new RefreshToken(
      this.jwtProvider,
      this.sessionRepository,
      this.hashProvider,
      this.userRepository,
    )
    return useCase.execute({ token }, secret)
  }
}
