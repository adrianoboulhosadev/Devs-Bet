import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { UploadController } from './upload.controller'

// AuthMiddleware resolves req.user (so AdminGuard can check the role) exactly as
// in the other protected modules.
@Module({
  imports: [AuthModule],
  controllers: [UploadController],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UploadController)
  }
}
