import { UserRepository, UserQueryRepository, User, UserDTO } from '../../src'
import { Role } from 'shared'

/**
 * Simulates the database TABLE: a plain row with the infra columns (createdAt,
 * lastLoginAt) that do NOT exist in the rich `User`. Writes SERIALIZE the entity
 * (reading its value objects); reads RECONSTITUTE it via the constructor — the
 * same round-trip the real Prisma repository does. The query projects the DTO.
 */
interface UserRow {
  id: string
  email: string
  password: string
  role: Role
  active: boolean
  createdAt: Date
  lastLoginAt: Date | null
}

export default class UserRepositoryInMemory implements UserRepository, UserQueryRepository {
  private readonly rows: UserRow[] = []

  private reconstitute(row: UserRow): User {
    return new User({
      id: row.id,
      email: row.email,
      password: row.password,
      role: row.role,
      active: row.active,
    })
  }

  async register(user: User): Promise<void> {
    this.rows.push({
      id: user.id.value,
      email: user.email.value,
      password: user.password!.value,
      role: user.role,
      active: user.active,
      createdAt: new Date(),
      lastLoginAt: null,
    })
  }

  async findById(id: string): Promise<User | null> {
    const row = this.rows.find((current) => current.id === id)
    return row ? this.reconstitute(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.rows.find((current) => current.email === email)
    return row ? this.reconstitute(row) : null
  }

  async changePassword(id: string, password: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.password = password
  }

  async updateLastLogin(id: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.lastLoginAt = new Date()
  }

  async deactivate(id: string): Promise<void> {
    const row = this.rows.find((current) => current.id === id)
    if (row) row.active = false
  }

  async delete(id: string): Promise<void> {
    const index = this.rows.findIndex((current) => current.id === id)
    if (index >= 0) this.rows.splice(index, 1)
  }

  async findByIdQuery(id: string): Promise<UserDTO | null> {
    const row = this.rows.find((current) => current.id === id)
    return row
      ? {
          id: row.id,
          email: row.email,
          role: row.role,
          active: row.active,
          createdAt: row.createdAt,
          lastLoginAt: row.lastLoginAt,
        }
      : null
  }
}
