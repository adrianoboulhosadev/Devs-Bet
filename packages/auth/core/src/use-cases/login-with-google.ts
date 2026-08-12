import { UseCase, UnauthorizedError, AccessDeniedError, NotFoundError, Errors, Id } from 'shared'
import { User, AuthSession, calculateRefreshExpiration, OAuthAccount } from '../model'
import {
  UserRepository,
  OAuthAccountRepository,
  GoogleTokenVerifier,
  GoogleProfile,
  HashProvider,
  JwtProvider,
  JwtTokens,
  JwtPayload,
  AuthSessionRepository,
} from '../providers'

interface Input {
  idToken: string
}

/**
 * Logs a user in via "Sign in with Google". The GoogleTokenVerifier (adapter)
 * already validated the token's signature/issuer/audience — this use case only
 * trusts the profile it returns, and still requires emailVerified before
 * touching any User record (an unverified email can never take over an
 * existing account). A repeat login finds the linked OAuthAccount directly by
 * (provider, providerAccountId); the FIRST login either auto-links an existing
 * User with the same email or creates a brand-new one (no password). From
 * there it issues the SAME access/refresh session as LoginUser (email+
 * password) — there is no difference downstream between the two login paths.
 */
export default class LoginWithGoogle implements UseCase<Input, JwtTokens> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly oauthAccountRepository: OAuthAccountRepository,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly hash: HashProvider,
    private readonly jwt: JwtProvider,
    private readonly sessionRepository: AuthSessionRepository,
  ) {}

  async execute({ idToken }: Input): Promise<JwtTokens> {
    const profile = await this.googleVerifier.verify(idToken)
    if (!profile.emailVerified) {
      UnauthorizedError.throwError(Errors.OAUTH_EMAIL_NOT_VERIFIED, profile.email)
    }

    const user = await this.resolveUser(profile)
    if (!user.active) UnauthorizedError.throwError(Errors.INVALID_EMAIL_OR_PASSWORD)

    // Same gate as LoginUser: a Google sign-in creates the account but does not
    // let anyone in — the admin still releases it (see User.approvalStatus).
    if (user.approvalStatus === 'rejected') {
      UnauthorizedError.throwError(Errors.INVALID_EMAIL_OR_PASSWORD)
    }
    if (!user.isApproved) AccessDeniedError.throwError(Errors.ACCOUNT_PENDING_APPROVAL)

    await this.userRepository.updateLastLogin(user.id.value)

    const sessionId = Id.create()
    const payload: JwtPayload = {
      userId: user.id.value,
      email: user.email.value,
      role: user.role,
      sessionId,
    }
    const tokens = this.jwt.generateTokens(payload)

    const session = new AuthSession({
      id: sessionId,
      userId: user.id.value,
      verifierHash: this.hash.hashToken(tokens.refreshToken),
      expiresAt: calculateRefreshExpiration(),
    })
    await this.sessionRepository.save(session)

    return tokens
  }

  private async resolveUser(profile: GoogleProfile): Promise<User> {
    const existingAccount = await this.oauthAccountRepository.findByProvider(
      'google',
      profile.providerAccountId,
    )
    if (existingAccount) {
      const user = await this.userRepository.findById(existingAccount.userId)
      if (!user) NotFoundError.throwError(Errors.USER_NOT_FOUND, existingAccount.userId)
      return user
    }

    // First login with this Google account: auto-link an existing User with the
    // same (verified) email, or create a brand-new one with no password.
    let user = await this.userRepository.findByEmail(profile.email)
    if (!user) {
      user = new User({ email: profile.email })
      await this.userRepository.register(user)
    }

    await this.oauthAccountRepository.create(
      new OAuthAccount({
        userId: user.id.value,
        provider: 'google',
        providerAccountId: profile.providerAccountId,
        email: profile.email,
      }),
    )

    return user
  }
}
