import { Injectable } from '@nestjs/common'
import { CategoryRepository, CategoryQueryRepository, Category, CategoryDTO } from '@category/adapters'
import { PrismaService } from '../db/prisma.service'

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository, CategoryQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } })
    return row ? new Category({ id: row.id, name: row.name, parentId: row.parentId }) : null
  }

  async create(category: Category): Promise<void> {
    await this.prisma.category.create({
      data: { id: category.id.value, name: category.name, parentId: category.parentId },
    })
  }

  async update(category: Category): Promise<void> {
    await this.prisma.category.update({
      where: { id: category.id.value },
      data: { name: category.name },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } })
  }

  async existsByNameAndParent(name: string, parentId: string | null): Promise<boolean> {
    const count = await this.prisma.category.count({ where: { name, parentId } })
    return count > 0
  }

  async hasChildren(id: string): Promise<boolean> {
    const count = await this.prisma.category.count({ where: { parentId: id } })
    return count > 0
  }

  async listQuery(): Promise<CategoryDTO[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { name: 'asc' } })
    // A node is a leaf when no other node points to it as parent.
    const parentIds = new Set(rows.map((row) => row.parentId).filter(Boolean) as string[])
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      isLeaf: !parentIds.has(row.id),
    }))
  }

  async findByIdQuery(id: string): Promise<CategoryDTO | null> {
    const row = await this.prisma.category.findUnique({ where: { id } })
    if (!row) return null
    const childCount = await this.prisma.category.count({ where: { parentId: id } })
    return { id: row.id, name: row.name, parentId: row.parentId, isLeaf: childCount === 0 }
  }
}
