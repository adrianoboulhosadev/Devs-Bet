import { Injectable } from '@nestjs/common'
import { UserRepository, UserQueryRepository, User, UserDTO, ApprovalStatus } from '@auth/adapters'
import { Role } from 'shared'
import { PrismaService } from '../db/prisma.service'

// The columns the read side projects — the password is never among them.
const USER_DTO_SELECT = {
  id: true,
  email: true,
  role: true,
  active: true,
  nickname: true,
  avatarUrl: true,
  approvalStatus: true,
  createdAt: true,
  lastLoginAt: true,
} as const

type UserDTORow = {
  id: string
  email: string
  role: string
  active: boolean
  nickname: string | null
  avatarUrl: string | null
  approvalStatus: string
  createdAt: Date
  lastLoginAt: Date | null
}

@Injectable()
export class PrismaUserRepository implements UserRepository, UserQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row (via its constructor). password is
  // null for a user created via an OAuth provider (see LoginWithGoogle).
  private reconstitute(row: {
    id: string
    email: string
    password: string | null
    role: string
    active: boolean
    nickname: string | null
    avatarUrl: string | null
    approvalStatus: string
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      password: row.password ?? undefined,
      role: row.role as Role,
      active: row.active,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      approvalStatus: row.approvalStatus as ApprovalStatus,
    })
  }

  async register(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id.value,
        email: user.email.value,
        password: user.password?.value ?? null,
        role: user.role,
        active: user.active,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        // Always explicit: the column's "approved" default exists only to carry
        // the accounts that predate the approval gate (see schema.prisma).
        approvalStatus: user.approvalStatus,
        // createdAt/lastLoginAt are infra: the DB handles them (default/update).
      },
    })
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    return user ? this.reconstitute(user) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    return user ? this.reconstitute(user) : null
  }

  async changePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { password } })
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } })
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { active: false } })
  }

  async updateProfile(
    id: string,
    fields: { nickname?: string | null; avatarUrl?: string | null },
  ): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: fields })
  }

  async updateApprovalStatus(id: string, status: ApprovalStatus): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { approvalStatus: status } })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }

  // Read side (CQRS): plain query projection, never the password.
  async findByIdQuery(id: string): Promise<UserDTO | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, select: USER_DTO_SELECT })
    return row ? this.toDTO(row) : null
  }

  async listUsersQuery(): Promise<UserDTO[]> {
    const rows = await this.prisma.user.findMany({
      select: USER_DTO_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => this.toDTO(row))
  }

  private toDTO(row: UserDTORow): UserDTO {
    return { ...row, role: row.role as Role, approvalStatus: row.approvalStatus as ApprovalStatus }
  }
}
