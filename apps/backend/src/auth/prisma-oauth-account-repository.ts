import { Injectable } from '@nestjs/common'
import { OAuthAccountRepository, OAuthAccount } from '@auth/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaOAuthAccountRepository implements OAuthAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | null> {
    const row = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    })
    return row
      ? new OAuthAccount({
          id: row.id,
          userId: row.userId,
          provider: row.provider,
          providerAccountId: row.providerAccountId,
          email: row.email,
        })
      : null
  }

  async create(account: OAuthAccount): Promise<void> {
    await this.prisma.oAuthAccount.create({
      data: {
        id: account.id.value,
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: account.email.value,
      },
    })
  }
}
