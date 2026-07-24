import { CategoryRepository, CategoryQueryRepository, Category, CategoryDTO } from '../../src'

interface CategoryRow {
  id: string
  name: string
  parentId: string | null
}

export default class CategoryRepositoryInMemory
  implements CategoryRepository, CategoryQueryRepository
{
  readonly categories: CategoryRow[] = []

  async findById(id: string): Promise<Category | null> {
    const row = this.categories.find((category) => category.id === id)
    return row ? new Category({ id: row.id, name: row.name, parentId: row.parentId }) : null
  }

  async create(category: Category): Promise<void> {
    this.categories.push({
      id: category.id.value,
      name: category.name,
      parentId: category.parentId,
    })
  }

  async update(category: Category): Promise<void> {
    const row = this.categories.find((current) => current.id === category.id.value)
    if (row) row.name = category.name
  }

  async delete(id: string): Promise<void> {
    const index = this.categories.findIndex((category) => category.id === id)
    if (index >= 0) this.categories.splice(index, 1)
  }

  async existsByNameAndParent(name: string, parentId: string | null): Promise<boolean> {
    return this.categories.some(
      (category) => category.name === name && category.parentId === parentId,
    )
  }

  async hasChildren(id: string): Promise<boolean> {
    return this.categories.some((category) => category.parentId === id)
  }

  async listQuery(): Promise<CategoryDTO[]> {
    return this.categories.map((row) => this.toDTO(row))
  }

  async findByIdQuery(id: string): Promise<CategoryDTO | null> {
    const row = this.categories.find((category) => category.id === id)
    return row ? this.toDTO(row) : null
  }

  private toDTO(row: CategoryRow): CategoryDTO {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      isLeaf: !this.categories.some((category) => category.parentId === row.id),
    }
  }
}
