import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { LoginUserInput, RegisterUserInput, UserFacade } from '@auth/adapters'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { REFRESH_COOKIE_OPTIONS } from './refresh-cookie-options'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
    private readonly jwtProvider: JsonWebTokenProvider,
  ) {}

  // Optional ports: each method uses only what it needs (register, login, refresh).
  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      undefined,
      this.hashProvider,
      this.jwtProvider,
      this.sessionRepository,
    )
  }

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
    if (!currentToken) throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED)

    // Rotation: issue a new pair and update the cookie with the rotated refresh.
    const { accessToken, refreshToken } = await this.facade().refreshToken(
      currentToken,
      process.env.JWT_SECRET!,
    )
    response.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
    return { accessToken }
  }
}
