import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DbModule } from './db/db.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { WalletModule } from './wallet/wallet.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, AuthModule, UserModule, WalletModule],
})
export class AppModule {}
