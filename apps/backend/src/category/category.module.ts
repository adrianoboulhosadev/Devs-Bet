import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { CategoryController } from './category.controller'
import { PrismaCategoryRepository } from './prisma-category-repository'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [CategoryController],
  providers: [PrismaCategoryRepository],
  // Exported so the match module can resolve a category's leaf-ness when
  // validating a match's category (cross-context, via the app layer).
  exports: [PrismaCategoryRepository],
})
export class CategoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(CategoryController)
  }
}
