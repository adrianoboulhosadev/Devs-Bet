import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { UploadController } from './upload.controller'
import { UploadReceiptController } from './upload-receipt.controller'

// AuthMiddleware resolves req.user for both controllers. UploadController is
// admin-only (its own class-level AdminGuard); UploadReceiptController is open to
// any authenticated user (they upload their own deposit receipt).
@Module({
  imports: [AuthModule],
  controllers: [UploadController, UploadReceiptController],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UploadController, UploadReceiptController)
  }
}
