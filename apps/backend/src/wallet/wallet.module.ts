import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { WalletController } from './wallet.controller'
import { AdminWalletController } from './admin-wallet.controller'
import { PrismaWalletRepository } from './prisma-wallet-repository'
import { ManualPaymentGateway } from './manual-payment-gateway'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [WalletController, AdminWalletController],
  providers: [PrismaWalletRepository, ManualPaymentGateway],
})
export class WalletModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(WalletController, AdminWalletController)
  }
}
