import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthController } from './auth.controller'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { AuthMiddleware } from './auth.middleware'

@Module({
  imports: [DbModule],
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    AuthMiddleware,
  ],
  exports: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    AuthMiddleware,
  ],
})
export class AuthModule {}
