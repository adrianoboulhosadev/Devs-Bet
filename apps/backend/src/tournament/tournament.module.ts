import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { QueueModule } from '../betting/queue.module'
import { CategoryModule } from '../category/category.module'
import { ParticipantModule } from '../participant/participant.module'
import { MatchModule } from '../match/match.module'
import { TournamentController } from './tournament.controller'
import { PrismaTournamentRepository } from './prisma-tournament-repository'

// Tournament orchestrates matches, so it imports MatchModule (to reuse the match
// repository + auto-lock queue via the MatchFacade), QueueModule (bet settlement),
// CategoryModule (leaf resolution) and ParticipantModule (catalog resolution). The
// dependency is one-way — MatchModule does not import TournamentModule — so there
// is no module cycle.
@Module({
  imports: [DbModule, AuthModule, QueueModule, CategoryModule, ParticipantModule, MatchModule],
  controllers: [TournamentController],
  providers: [PrismaTournamentRepository],
})
export class TournamentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(TournamentController)
  }
}
