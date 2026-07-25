import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { BetController } from './bet.controller'
import { PrismaBettingPlacementRepository } from './prisma-betting-placement-repository'
import { PrismaBetQueryRepository } from './prisma-bet-query-repository'
import { PrismaMatchRepository } from '../match/prisma-match-repository'
import { PrismaTournamentRepository } from '../tournament/prisma-tournament-repository'
import { PrismaWalletRepository } from '../wallet/prisma-wallet-repository'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [BetController],
  // The match/tournament/wallet repositories only need PrismaService, so
  // betting registers them directly — to resolve a bet's market (status +
  // selections) and the bettor's self-exclusion — without importing those modules.
  providers: [
    PrismaBettingPlacementRepository,
    PrismaBetQueryRepository,
    PrismaMatchRepository,
    PrismaTournamentRepository,
    PrismaWalletRepository,
  ],
})
export class BettingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(BetController)
  }
}
