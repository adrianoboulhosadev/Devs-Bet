import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { UserDTO, UserFacade } from '@auth/adapters'
import { AuthenticatedActor } from 'shared'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { PrismaAuthSessionRepository } from '../auth/prisma-auth-session-repository'
import { NotificationDispatcher } from '../notification/notification.dispatcher'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { AdminGuard } from '../shared/admin.guard'

/**
 * The platform's front door. This is a closed, friends-only product: signing up
 * only creates the account, and an admin releases it here (or bars it — which
 * doubles as revoking access from someone already in).
 *
 * AuthMiddleware resolves req.user (see user.module); AdminGuard enforces the
 * role at the edge; the AdminUseCase re-checks it in the domain.
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly notifications: NotificationDispatcher,
  ) {}

  private facade(): UserFacade {
    return new UserFacade(
      this.userRepository,
      this.userRepository,
      undefined,
      undefined,
      this.sessionRepository,
    )
  }

  private actor(user: UserDTO): AuthenticatedActor {
    return { id: user.id, role: user.role }
  }

  @Get('users')
  list(@authenticatedUser() user: UserDTO): Promise<UserDTO[]> {
    return this.facade().listUsers(this.actor(user))
  }

  @Post('users/:id/approve')
  @HttpCode(204)
  async approve(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().setUserApproval({ userId: id, status: 'approved' }, this.actor(user))

    // Waiting for it in the inbox: the person only reads this once they can
    // finally log in, which is exactly when it is useful. Rejection stays
    // silent on purpose — being barred must look like a wrong password
    // (see LoginUser), and an inbox line would give that away.
    await this.notifications.notify([
      { userId: id, type: 'account_approved', referenceId: id },
    ])
  }

  // Also the way to revoke access from an already-approved account: the use case
  // tears down that user's open sessions.
  @Post('users/:id/reject')
  @HttpCode(204)
  async reject(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().setUserApproval({ userId: id, status: 'rejected' }, this.actor(user))
  }
}
