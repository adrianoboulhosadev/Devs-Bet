import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { BetController } from './bet.controller'
import { PrismaBettingPlacementRepository } from './prisma-betting-placement-repository'
import { PrismaBetQueryRepository } from './prisma-bet-query-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [BetController],
  providers: [PrismaBettingPlacementRepository, PrismaBetQueryRepository, PrismaMatchRepository],
})
export class BettingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(BetController)
  }
}
