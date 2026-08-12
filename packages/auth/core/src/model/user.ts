import { AggregateRoot, EntityProps, Role } from 'shared'
import { Email } from './email'
import { PasswordHash } from './password-hash'
import { UserApproved } from './events'

/**
 * Gate to the platform: this is a closed, friends-only product, so signing up
 * only CREATES the identity — an admin still has to release it. `rejected` is
 * terminal-ish (an admin can re-approve), and never announced to the user: the
 * login answers it as invalid credentials.
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface UserProps extends EntityProps {
  email?: string
  // The stored HASH (never plaintext). Optional: the read side / a projection
  // without the secret reconstitutes the User without it.
  password?: string
  role?: Role
  active?: boolean
  // Display-only. Never used for authentication — Email stays the identity.
  nickname?: string | null
  avatarUrl?: string | null
  approvalStatus?: ApprovalStatus
}

/**
 * Rich identity entity. Aggregates the value objects (Email, PasswordHash) and
 * the authorization role; the constructor builds/validates them, so an invalid
 * User cannot exist. `role` defaults to 'user'; `active` to true;
 * `approvalStatus` to 'pending' — a brand-new account is always waiting for an
 * admin, whichever path created it (sign-up form or first Google login).
 */
export class User extends AggregateRoot<User, UserProps> {
  readonly email: Email
  readonly password?: PasswordHash
  readonly role: Role
  active: boolean
  nickname: string | null
  avatarUrl: string | null
  approvalStatus: ApprovalStatus

  constructor(props: UserProps) {
    super(props)
    this.email = new Email(props.email)
    if (props.password) this.password = new PasswordHash(props.password)
    this.role = props.role ?? 'user'
    this.active = props.active ?? true
    this.nickname = props.nickname?.trim() || null
    this.avatarUrl = props.avatarUrl ?? null
    this.approvalStatus = props.approvalStatus ?? 'pending'
  }

  get isAdmin(): boolean {
    return this.role === 'admin'
  }

  get isApproved(): boolean {
    return this.approvalStatus === 'approved'
  }

  /** Admin releases the account (also the way back in for a rejected one). */
  approve(): void {
    this.approvalStatus = 'approved'
    this.record(new UserApproved(this.id.value))
  }

  /** Admin bars the account — either denying a new sign-up or revoking access
   * from someone already in. Killing the open sessions is the use case's job
   * (it owns the session port). */
  reject(): void {
    this.approvalStatus = 'rejected'
  }

  /** Display-only fields, editable any time — no invariant beyond trimming. */
  editProfile(fields: { nickname?: string | null; avatarUrl?: string | null }): void {
    if (fields.nickname !== undefined) this.nickname = fields.nickname?.trim() || null
    if (fields.avatarUrl !== undefined) this.avatarUrl = fields.avatarUrl
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
