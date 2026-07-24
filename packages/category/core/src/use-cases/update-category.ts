import { AdminUseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { CategoryRepository } from '../providers'

interface Input {
  categoryId: string
  name: string
}

/**
 * Admin renames a category node. Only the name changes (a node never moves in
 * the tree). The new name must stay unique among its siblings. Admin-only.
 */
export default class UpdateCategory extends AdminUseCase<Input, void> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super()
  }

  protected async executeAsAdmin({ categoryId, name }: Input): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)

    category.rename(name)

    // The node still carries its OLD name in storage, so a hit here is a real
    // sibling clash (never the node itself).
    if (await this.categoryRepository.existsByNameAndParent(category.name, category.parentId)) {
      ConflictError.throwError(Errors.CATEGORY_ALREADY_EXISTS, category.name)
    }

    await this.categoryRepository.update(category)
  }
}
