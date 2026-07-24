import { AdminUseCase, NotFoundError, ConflictError, Errors } from 'shared'
import { Category } from '../model'
import { CategoryRepository } from '../providers'

interface Input {
  name: string
  parentId?: string | null
}

/**
 * Admin creates a category node. If a parent is given it must exist; the name
 * must be unique among its siblings (same parent). Admin-only (AdminUseCase).
 */
export default class CreateCategory extends AdminUseCase<Input, void> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super()
  }

  protected async executeAsAdmin(input: Input): Promise<void> {
    const parentId = input.parentId ?? null

    if (parentId) {
      const parent = await this.categoryRepository.findById(parentId)
      if (!parent) NotFoundError.throwError(Errors.CATEGORY_NOT_FOUND, parentId)
    }

    const category = new Category({ name: input.name, parentId })

    if (await this.categoryRepository.existsByNameAndParent(category.name, parentId)) {
      ConflictError.throwError(Errors.CATEGORY_ALREADY_EXISTS, category.name)
    }

    await this.categoryRepository.create(category)
  }
}
