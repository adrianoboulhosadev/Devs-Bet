import { Injectable } from '@nestjs/common'
import { UserRepository, UserQueryRepository, User, UserDTO } from '@auth/adapters'
import { Role } from 'shared'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaUserRepository implements UserRepository, UserQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row (via its constructor).
  private reconstitute(row: {
    id: string
    email: string
    password: string
    role: string
    active: boolean
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      password: row.password,
      role: row.role as Role,
      active: row.active,
    })
  }

  async register(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id.value,
        email: user.email.value,
        password: user.password!.value,
        role: user.role,
        active: user.active,
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

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }

  // Read side (CQRS): plain query projection, never the password.
  async findByIdQuery(id: string): Promise<UserDTO | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, active: true, createdAt: true, lastLoginAt: true },
    })
    return row ? { ...row, role: row.role as Role } : null
  }
}
