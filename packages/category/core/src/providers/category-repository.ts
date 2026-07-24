import { Category } from '../model'

/**
 * Category WRITE port (command side). Dedup uses `existsByNameAndParent`
 * (boolean, no fetch-and-map); `hasChildren` guards deletion and is also how the
 * app resolves leaf-ness when validating a match's category.
 */
export interface CategoryRepository {
  findById(id: string): Promise<Category | null>
  create(category: Category): Promise<void>
  update(category: Category): Promise<void>
  delete(id: string): Promise<void>
  existsByNameAndParent(name: string, parentId: string | null): Promise<boolean>
  hasChildren(id: string): Promise<boolean>
}
