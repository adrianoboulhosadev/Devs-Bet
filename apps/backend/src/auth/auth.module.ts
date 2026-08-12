import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { AuthController } from './auth.controller'
import { PrismaUserRepository } from './prisma-user-repository'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { PrismaOAuthAccountRepository } from './prisma-oauth-account-repository'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { GoogleOAuthVerifier } from './google-oauth-verifier'
import { AuthMiddleware } from './auth.middleware'

@Module({
  imports: [DbModule, NotificationStoreModule],
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    PrismaOAuthAccountRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    GoogleOAuthVerifier,
    AuthMiddleware,
  ],
  exports: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    PrismaOAuthAccountRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    GoogleOAuthVerifier,
    AuthMiddleware,
  ],
})
export class AuthModule {}
