import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { ParticipantController } from './participant.controller'
import { PrismaParticipantRepository } from './prisma-participant-repository'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [ParticipantController],
  providers: [PrismaParticipantRepository],
  // Exported so the match/tournament modules can resolve the catalog entries a
  // create-match/create-tournament form picked (cross-context, via the app layer).
  exports: [PrismaParticipantRepository],
})
export class ParticipantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ParticipantController)
  }
}
