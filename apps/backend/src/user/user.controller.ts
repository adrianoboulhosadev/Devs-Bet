import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { ChangePasswordInput, UserDTO, UserFacade } from '@auth/adapters'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { PrismaAuthSessionRepository } from '../auth/prisma-auth-session-repository'
import { BcryptHashProvider } from '../auth/bcrypt-hash-provider'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// Routes protected by the AuthMiddleware (see user.module). The userId ALWAYS
// comes from the token (anti-IDOR), never from a route parameter.
@Controller('user')
export class UserController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly hashProvider: BcryptHashProvider,
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

  // Has the full UserDTO available, but the presenter returns only what the front needs.
  @Get('me')
  me(@authenticatedUser() user: UserDTO): Pick<UserDTO, 'id' | 'email' | 'role'> {
    return { id: user.id, email: user.email, role: user.role }
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
