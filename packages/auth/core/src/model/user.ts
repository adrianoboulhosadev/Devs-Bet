import { Entity, EntityProps, Role } from 'shared'
import { Email } from './email'
import { PasswordHash } from './password-hash'

export interface UserProps extends EntityProps {
  email?: string
  // The stored HASH (never plaintext). Optional: the read side / a projection
  // without the secret reconstitutes the User without it.
  password?: string
  role?: Role
  active?: boolean
}

/**
 * Rich identity entity. Aggregates the value objects (Email, PasswordHash) and
 * the authorization role; the constructor builds/validates them, so an invalid
 * User cannot exist. `role` defaults to 'user'; `active` to true.
 */
export class User extends Entity<User, UserProps> {
  readonly email: Email
  readonly password?: PasswordHash
  readonly role: Role
  active: boolean

  constructor(props: UserProps) {
    super(props)
    this.email = new Email(props.email)
    if (props.password) this.password = new PasswordHash(props.password)
    this.role = props.role ?? 'user'
    this.active = props.active ?? true
  }

  get isAdmin(): boolean {
    return this.role === 'admin'
  }

  /** Projection of the same identity without the secret (for handing outward). */
  withoutPassword(): User {
    return this.clone({ password: undefined })
  }

  /** Soft-delete transition: the identity stays but can no longer authenticate. */
  deactivate(): void {
    this.active = false
  }
}
