import { Entity, EntityProps, ValidationError, Errors } from 'shared'
import { Email } from './email'

export interface OAuthAccountProps extends EntityProps {
  userId?: string
  // 'google' today — a plain string (no enum) since only one provider exists.
  provider?: string
  providerAccountId?: string
  email?: string
}

/**
 * Links a User to an external OAuth identity (provider + providerAccountId).
 * Lets a repeat login find the SAME account directly (no re-checking the
 * email) and keeps a record of which provider was used — see LoginWithGoogle.
 */
export class OAuthAccount extends Entity<OAuthAccount, OAuthAccountProps> {
  readonly userId: string
  readonly provider: string
  readonly providerAccountId: string
  readonly email: Email

  constructor(props: OAuthAccountProps) {
    super(props)
    const userId = props.userId?.trim() ?? ''
    if (!userId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'userId')
    const provider = props.provider?.trim() ?? ''
    if (!provider) ValidationError.throwError(Errors.REQUIRED_FIELD, 'provider')
    const providerAccountId = props.providerAccountId?.trim() ?? ''
    if (!providerAccountId) ValidationError.throwError(Errors.REQUIRED_FIELD, 'providerAccountId')

    this.userId = userId
    this.provider = provider
    this.providerAccountId = providerAccountId
    this.email = new Email(props.email)
  }
}
