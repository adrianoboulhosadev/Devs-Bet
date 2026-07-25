import { OAuthAccountRepository, OAuthAccount } from '../../src'

interface OAuthAccountRow {
  id: string
  userId: string
  provider: string
  providerAccountId: string
  email: string
}

export default class OAuthAccountRepositoryInMemory implements OAuthAccountRepository {
  readonly rows: OAuthAccountRow[] = []

  async findByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | null> {
    const row = this.rows.find(
      (current) => current.provider === provider && current.providerAccountId === providerAccountId,
    )
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
    this.rows.push({
      id: account.id.value,
      userId: account.userId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      email: account.email.value,
    })
  }
}
