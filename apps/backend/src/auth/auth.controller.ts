import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { UnauthorizedError, Errors } from 'shared'
import { LoginUserInput, RegisterUserInput, LoginWithGoogleInput, UserFacade } from '@auth/adapters'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { PrismaOAuthAccountRepository } from './prisma-oauth-account-repository'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { GoogleOAuthVerifier } from './google-oauth-verifier'
import { REFRESH_COOKIE_OPTIONS } from './refresh-cookie-options'
import { GoogleLoginGuard } from './google-login.guard'
import { DomainEventListener } from '../notification/domain-event-listener'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
    private readonly jwtProvider: JsonWebTokenProvider,
    private readonly oauthAccountRepository: PrismaOAuthAccountRepository,
    private readonly googleVerifier: GoogleOAuthVerifier,
    private readonly events: DomainEventListener,
  ) {}

  // Optional ports: each method uses only what it needs (register, login, refresh).
  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      undefined,
      this.hashProvider,
      this.jwtProvider,
      this.sessionRepository,
      this.oauthAccountRepository,
      this.googleVerifier,
      this.events,
    )
  }

  // The account is born pending (see the front door in CLAUDE.md); telling the
  // admins someone is at the gate is the DomainEventListener's job, off the
  // UserRegistered event the use case publishes.
  @Post('register')
  async register(@Body() input: RegisterUserInput) {
    await this.facade().registerUser(input)
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginUserInput, @Res({ passthrough: true }) response: Response) {
    const { accessToken, refreshToken } = await this.facade().loginUser(input)
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const currentToken = request.cookies?.['refreshToken']
    if (!currentToken) UnauthorizedError.throwError(Errors.NOT_AUTHENTICATED)

    // Rotation: issue a new pair and update the cookie with the rotated refresh.
    const { accessToken, refreshToken } = await this.facade().refreshToken(
      currentToken,
      process.env.JWT_SECRET!,
    )
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }

  // "Sign in with Google": the front runs the OAuth handshake through NextAuth
  // (a disposable bridge — see apps/web) and posts the resulting Google ID
  // token here. The token is verified against Google's JWKS (GoogleOAuthVerifier)
  // — never trusted as-is — then the SAME access/refresh session as /login is
  // issued (identical cookie + response contract).
  // Closed with a plain 404 while GOOGLE_CLIENT_ID is unset — see the guard.
  @Post('oauth/google')
  @UseGuards(GoogleLoginGuard)
  @HttpCode(200)
  async loginWithGoogle(
    @Body() input: LoginWithGoogleInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.facade().loginWithGoogle(input)
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }
}
