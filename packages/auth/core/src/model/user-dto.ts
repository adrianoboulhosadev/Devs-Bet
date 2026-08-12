import { Role } from 'shared'
import { ApprovalStatus } from './user'

/**
 * READ projection (CQRS) of the user — what the database query brings, minus the
 * secret. NEVER includes `password`. Carries `role` (needed for authorization at
 * the edge) and the infra/audit fields (createdAt, lastLoginAt) that live only
 * on the read side. Plain interface — no entity, no value objects.
 */
export interface UserDTO {
  id: string
  email: string
  role: Role
  active: boolean
  nickname: string | null
  avatarUrl: string | null
  approvalStatus: ApprovalStatus
  createdAt: Date
  lastLoginAt: Date | null
}
