import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { NotificationStoreModule } from './notification-store.module'
import { NotificationController } from './notification.controller'
import { NotificationStreamController } from './notification-stream.controller'
import { StreamAuthGuard } from './stream-auth.guard'

@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [NotificationController, NotificationStreamController],
  providers: [StreamAuthGuard],
})
export class NotificationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // NotificationStreamController is deliberately NOT here: EventSource cannot
    // send an Authorization header, so it authenticates via StreamAuthGuard
    // (token in the query string) instead.
    consumer.apply(AuthMiddleware).forRoutes(NotificationController)
  }
}
