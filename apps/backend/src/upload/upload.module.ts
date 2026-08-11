import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { UploadController } from './upload.controller'
import { UploadReceiptController } from './upload-receipt.controller'
import { UploadAvatarController } from './upload-avatar.controller'

// AuthMiddleware resolves req.user for every controller. UploadController is
// admin-only (its own class-level AdminGuard); UploadReceiptController and
// UploadAvatarController are open to any authenticated user (they upload their
// own deposit receipt / profile picture).
@Module({
  imports: [AuthModule],
  controllers: [UploadController, UploadReceiptController, UploadAvatarController],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(UploadController, UploadReceiptController, UploadAvatarController)
  }
}
