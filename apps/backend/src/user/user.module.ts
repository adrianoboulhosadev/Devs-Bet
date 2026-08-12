import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { UserController } from './user.controller'
import { AdminUserController } from './admin-user.controller'
import { PrismaBetQueryRepository } from '../betting/prisma-bet-query-repository'

@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [UserController, AdminUserController],
  providers: [PrismaBetQueryRepository],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UserController, AdminUserController)
  }
}
