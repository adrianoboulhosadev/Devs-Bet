import { OAuthAccount } from '../model'

/** OAuthAccount port. `findByProvider` is how a repeat login finds the linked
 * User directly, without re-checking the email (see LoginWithGoogle). */
export interface OAuthAccountRepository {
  findByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | null>
  create(account: OAuthAccount): Promise<void>
}
