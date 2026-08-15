import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { NotificationFacade, NotificationFeedDTO } from '@notification/adapters'
import { UserDTO } from '@auth/adapters'
import { PrismaNotificationRepository } from './prisma-notification-repository'
import { authenticatedUser } from '../shared/authenticated-user.decorator'

// The user's own inbox. Protected by the AuthMiddleware (see notification.module).
// The userId ALWAYS comes from the token (anti-IDOR) — there is no route that
// reads or writes someone else's notifications.
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationRepository: PrismaNotificationRepository) {}

  private facade(): NotificationFacade {
    return new NotificationFacade(this.notificationRepository, this.notificationRepository)
  }

  // Serves both the header bell (a short slice) and the inbox page. A junk
  // `limit` falls back to the default inside the use case, which also clamps it.
  @Get()
  list(
    @authenticatedUser() user: UserDTO,
    @Query('limit') limit?: string,
  ): Promise<NotificationFeedDTO> {
    return this.facade().listMyNotifications(user.id, limit === undefined ? undefined : Number(limit))
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@authenticatedUser() user: UserDTO) {
    await this.facade().markAllAsRead(user.id)
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().markAsRead(id, user.id)
  }

  // Declared BEFORE ':id' so "all" is never captured as a notification id.
  @Delete('all')
  @HttpCode(204)
  async removeAll(@authenticatedUser() user: UserDTO) {
    await this.facade().deleteAllNotifications(user.id)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @authenticatedUser() user: UserDTO) {
    await this.facade().deleteNotification(id, user.id)
  }
}
