import {
  LoginWithGoogle,
  UserRepository,
  OAuthAccountRepository,
  GoogleTokenVerifier,
  HashProvider,
  JwtProvider,
  JwtTokens,
  AuthSessionRepository,
} from '@auth/core'
import { LoginWithGoogleInput } from '../@types'

export default class LoginWithGoogleController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly oauthAccountRepository: OAuthAccountRepository,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly hashProvider: HashProvider,
    private readonly jwtProvider: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute(input: LoginWithGoogleInput): Promise<JwtTokens> {
    const useCase = new LoginWithGoogle(
      this.userRepository,
      this.oauthAccountRepository,
      this.googleVerifier,
      this.hashProvider,
      this.jwtProvider,
      this.sessionRepository,
    )
    return useCase.execute(input)
  }
}
