import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { CommentController } from './comment.controller'
import { PrismaCommentRepository } from './prisma-comment-repository'
import { CommentAuthors } from './comment-authors'

// NotificationStoreModule provides the DomainEventListener: replying to someone
// raises CommentReplied, which becomes the line in their inbox (and the live
// ping) AFTER the comment is committed.
@Module({
  imports: [DbModule, AuthModule, NotificationStoreModule],
  controllers: [CommentController],
  providers: [PrismaCommentRepository, CommentAuthors],
})
export class CommentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(CommentController)
  }
}
