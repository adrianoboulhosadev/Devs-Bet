import { AdminUseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { CategoryRepository } from '../providers'

interface Input {
  categoryId: string
}

/**
 * Admin deletes a category node. Refused if it has children (delete the leaves
 * first) — keeps the tree consistent. Admin-only (AdminUseCase).
 */
export default class DeleteCategory extends AdminUseCase<Input, void> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super()
  }

  protected async executeAsAdmin({ categoryId }: Input): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, categoryId)

    if (await this.categoryRepository.hasChildren(categoryId)) {
      ConflictError.throwError(Errors.CATEGORY_HAS_CHILDREN, categoryId)
    }

    await this.categoryRepository.delete(categoryId)
  }
}
