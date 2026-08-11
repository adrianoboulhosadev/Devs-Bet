import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { ChangePasswordInput, UpdateProfileInput, UserDTO, UserFacade } from '@auth/adapters'
import { BettingFacade } from '@betting/adapters'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { PrismaAuthSessionRepository } from '../auth/prisma-auth-session-repository'
import { BcryptHashProvider } from '../auth/bcrypt-hash-provider'
import { PrismaBetQueryRepository } from '../betting/prisma-bet-query-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// Composed cross-context read model (auth + betting) — no single context owns
// this shape, so it is assembled here in the app layer, the same reasoning
// PlaceBet uses to touch wallet+match+betting. Never exported from an adapters
// package; the front hand-mirrors this shape.
interface ProfileDTO {
  id: string
  email: string
  nickname: string | null
  avatarUrl: string | null
  createdAt: Date
  wins: number
  losses: number
  xp: number
  level: number
  xpIntoLevel: number
  xpToNextLevel: number
}

// Routes protected by the AuthMiddleware (see user.module). The userId ALWAYS
// comes from the token (anti-IDOR), never from a route parameter.
@Controller('user')
export class UserController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
    private readonly betQueryRepository: PrismaBetQueryRepository,
  ) {}

  // Optional ports: each method uses only what it needs (change-password, logout, deactivate).
  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      undefined,
      this.hashProvider,
      undefined,
      this.sessionRepository,
    )
  }

  private bettingFacade(): BettingFacade {
    return new BettingFacade(undefined, undefined, this.betQueryRepository)
  }

  // Has the full UserDTO available, but the presenter returns only what the front needs.
  @Get('me')
  me(@authenticatedUser() user: UserDTO): Pick<UserDTO, 'id' | 'email' | 'role'> {
    return { id: user.id, email: user.email, role: user.role }
  }

  // Cross-context: the identity fields come straight from the JWT-resolved
  // UserDTO (already a fresh DB read, see AuthMiddleware); the win/loss/XP/level
  // fields come from betting's read model, computed live from settled bets.
  @Get('me/profile')
  async profile(@authenticatedUser() user: UserDTO): Promise<ProfileDTO> {
    const stats = await this.bettingFacade().getMyProfileStats(user.id)
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      ...stats,
    }
  }

  // Display-only edit (nickname/avatar) — never email/password/role.
  @Patch('me')
  @HttpCode(204)
  async updateProfile(@Body() input: UpdateProfileInput, @authenticatedUser() user: UserDTO) {
    await this.facade().updateProfile(input, user.id)
  }

  @Patch('change-password')
  @HttpCode(204)
  async changePassword(@Body() input: ChangePasswordInput, @authenticatedUser() user: UserDTO) {
    await this.facade().changePassword(input, user.id)
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @authenticatedUser() user: UserDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.['refreshToken']
    await this.facade().logoutUser(user.id, refreshToken)
    response.clearCookie('refreshToken', { path: '/' })
  }

  @Delete('deactivate')
  @HttpCode(204)
  async deactivate(@authenticatedUser() user: UserDTO) {
    await this.facade().deactivateUser(user.id)
  }
}
